import React, { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, Hand, MessageSquare, Send, Users, Radio,
  ScreenShare, PhoneOff, GraduationCap, Clock, CalendarDays, Lock, LogOut,
  ShieldCheck, ShieldAlert, MousePointerClick, ArrowLeft, MonitorPlay, BookOpen, ClipboardList, CalendarOff,
} from 'lucide-react';
import { sessionForCourse } from '../../data/lectures';
import { INDEPENDENT_ID } from '../../data/institutions';
import { checkCourseAccess, catalogCoursesFor, hostableCoursesFor } from '../../lib/access';
import { useClassroomStore } from '../../state/classroomContext';
import Avatar from '../common/Avatar';
import StudyMaterials from './StudyMaterials';
import QuizEngine from './QuizEngine';

// NOTE: Video SDK (agora-rtc-react) is installed but not connected yet.
// When the API layer is ready: read VITE_AGORA_APP_ID from .env.local, fetch a
// channel token from the backend, wrap the live stage in <AgoraRTCProvider client={...}>
// and replace the placeholder tiles below with <RemoteUser>/<LocalUser> components.
const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID;

const STATUS_STYLES = {
  live: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  scheduled: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  ended: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  none: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

export default function ClassroomView() {
  const { currentUser, courses, institutions, signOut } = useClassroomStore();
  const [activeCourseId, setActiveCourseId] = useState(null);

  const instOf = (id) => institutions.find((i) => i.id === id);
  // Catalog only shows courses tied to the user's institution (or open courses for independents)
  const catalog = catalogCoursesFor(currentUser, courses, institutions).sort((a, b) => a.code.localeCompare(b.code));
  const hostableCourses = hostableCoursesFor(currentUser, courses);
  const course = catalog.find((c) => c.id === activeCourseId) || null;
  const access = course ? checkCourseAccess(currentUser, course, instOf(course.institutionId)) : null;
  const isIndependent = currentUser.institutionId === INDEPENDENT_ID;

  return (
    <div className="space-y-6">
      {/* COURSE CATALOG */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-500" /> Distance Learning Catalog
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isIndependent ? 'Open courses available to independent learners' : `Courses published by ${currentUser.institution}`}
            </p>
          </div>
          <UserBadge user={currentUser} onSignOut={signOut} />
        </div>

        {catalog.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            {isIndependent ? 'No open courses are available right now.' : `${currentUser.institution} hasn’t published any courses yet.`}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {catalog.map((c) => {
              const session = sessionForCourse(c.id);
              const { allowed } = checkCourseAccess(currentUser, c, instOf(c.institutionId));
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCourseId(c.id)}
                  className={`text-left p-3 rounded-xl border transition ${
                    c.id === activeCourseId
                      ? 'border-indigo-500 bg-indigo-500/5'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[session?.status ?? 'none']}`}>
                      {session ? (session.status === 'live' ? '● Live' : session.status) : 'No session'}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      {!allowed && <Lock className="w-3 h-3 text-slate-500" aria-label="Restricted" />}
                      {c.code}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{c.title}</p>
                  <p className="text-[10px] text-slate-400">
                    {session ? `${session.instructor.name} • ` : ''}
                    {c.department} • {c.creditHours} cr
                    {isIndependent && ` • ${instOf(c.institutionId)?.name}`}
                  </p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                    {session ? (
                      <>
                        <CalendarDays className="w-3 h-3" /> {new Date(session.startsAt).toLocaleString()}
                        <Clock className="w-3 h-3 ml-2" /> {session.durationMins}m
                      </>
                    ) : (
                      'Materials & quizzes only'
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!course && catalog.length > 0 && (
        <EmptyState icon={MousePointerClick} title="Select a course to join" body="Pick a course from the catalog above. We’ll check your enrollment before connecting you." />
      )}

      {course && !access.allowed && (
        <EmptyState
          icon={Lock}
          tone="locked"
          title={`You don’t have access to ${course.code}`}
          body={access.reason}
          action={
            <button onClick={() => setActiveCourseId(null)} className="text-xs font-bold text-indigo-400 flex items-center gap-1 mx-auto">
              <ArrowLeft className="w-3 h-3" /> Back to catalog
            </button>
          }
        />
      )}

      {course && access.allowed && (
        // key resets session-scoped state (chat, hands, tab) when switching courses
        <CourseSession
          key={course.id}
          course={course}
          lecture={sessionForCourse(course.id)}
          user={currentUser}
          roomRole={access.roomRole}
          accessNote={access.reason}
          hostableCourses={hostableCourses}
        />
      )}
    </div>
  );
}

const SESSION_TABS = [
  { id: 'live', label: 'Live Stream & Q&A', icon: MonitorPlay },
  { id: 'materials', label: 'Study Materials', icon: BookOpen },
  { id: 'quizzes', label: 'Assessments & Quizzes', icon: ClipboardList },
];

function CourseSession({ course, lecture, user, roomRole, accessNote, hostableCourses }) {
  const isInstructor = roomRole === 'instructor';
  const { materials, quizzes } = useClassroomStore();
  const counts = {
    materials: materials.filter((m) => m.courseId === course.id).length,
    quizzes: quizzes.filter((q) => q.courseId === course.id).length,
  };
  const [sessionTab, setSessionTab] = useState(lecture ? 'live' : 'materials');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Course sections" className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          {SESSION_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={sessionTab === id}
              onClick={() => setSessionTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                sessionTab === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
              {counts[id] > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full ${sessionTab === id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800'}`}>{counts[id]}</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> {course.code}: {accessNote} — joined as {isInstructor ? 'host' : 'participant'}
        </p>
      </div>

      {sessionTab === 'materials' && <StudyMaterials course={course} user={user} roomRole={roomRole} hostableCourses={hostableCourses} />}
      {sessionTab === 'quizzes' && <QuizEngine course={course} user={user} roomRole={roomRole} hostableCourses={hostableCourses} />}
      {sessionTab === 'live' &&
        (lecture ? (
          <LiveStage course={course} lecture={lecture} user={user} roomRole={roomRole} />
        ) : (
          <EmptyState
            icon={CalendarOff}
            title={`No live session scheduled for ${course.code}`}
            body="Study materials and quizzes for this course are available in the other tabs."
          />
        ))}
    </div>
  );
}

function LiveStage({ course, lecture, user, roomRole }) {
  const isInstructor = roomRole === 'instructor';
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [liveMessages, setLiveMessages] = useState(lecture.messages);
  const [raisedHands, setRaisedHands] = useState([]); // student names, visible to instructor
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [draft, setDraft] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [liveMessages]);

  const toggleHand = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    setRaisedHands((prev) => (next ? [...prev, user.name] : prev.filter((n) => n !== user.name)));
  };

  const sendMessage = () => {
    if (!draft.trim()) return;
    const now = new Date();
    setLiveMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        author: user.name,
        role: roomRole,
        avatarUrl: user.avatarUrl,
        text: draft.trim(),
        ts: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      },
    ]);
    setDraft('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* STAGE: INSTRUCTOR STREAM + STUDENT GRID */}
      <div className="lg:col-span-8 space-y-4">
        <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
          <div className="text-center space-y-2">
            <Avatar name={isInstructor ? user.name : lecture.instructor.name} src={isInstructor ? user.avatarUrl : undefined} size="xl" className="mx-auto" />
            <p className="text-sm font-bold text-white">{isInstructor ? `${user.name} (You)` : lecture.instructor.name}</p>
            <p className="text-[11px] text-slate-400">{isInstructor ? `Broadcasting to ${course.code}` : lecture.instructor.title}</p>
            <p className="text-[10px] text-slate-500 pt-2">
              {AGORA_APP_ID ? 'Video SDK configured — stream will mount here' : 'Instructor video stream placeholder (Video SDK not connected)'}
            </p>
          </div>
          {lecture.status === 'live' && (
            <span className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-rose-600 text-white">
              <Radio className="w-3 h-3 animate-pulse" /> LIVE
            </span>
          )}
          <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-900/80 text-slate-200">
            <Users className="w-3 h-3" /> {lecture.attendees}
          </span>
          <div className="absolute bottom-3 left-3 right-3 text-[11px] text-slate-300 bg-slate-900/70 rounded-lg px-3 py-1.5">
            <span className="font-bold">Topic:</span> {lecture.topic}
          </div>
        </div>

        {/* Student A/V grid placeholder */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {!isInstructor && (
            <div className="relative aspect-video rounded-xl bg-slate-900 border-2 border-indigo-500/60 flex items-center justify-center">
              {camOn ? (
                <span className="flex flex-col items-center gap-1">
                  <Avatar name={user.name} src={user.avatarUrl} size="lg" />
                  <span className="text-[10px] font-bold text-slate-300">You</span>
                </span>
              ) : (
                <VideoOff className="w-5 h-5 text-slate-500" />
              )}
              {isHandRaised && <Hand className="absolute top-1.5 right-1.5 w-4 h-4 text-amber-400" />}
              <span className="absolute bottom-1.5 left-1.5">
                {micOn ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-rose-400" />}
              </span>
            </div>
          )}
          {lecture.students.map((s) => (
            <div key={s.id} className="relative aspect-video rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              {s.camOn ? <span className="text-xs font-bold text-slate-300">{s.name}</span> : <VideoOff className="w-5 h-5 text-slate-600" />}
              <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                {s.muted ? <MicOff className="w-3 h-3 text-rose-400" /> : <Mic className="w-3 h-3 text-emerald-400" />}
                {!s.camOn && s.name}
              </span>
            </div>
          ))}
          {lecture.students.length === 0 && <p className="col-span-full text-xs text-slate-400">No other participants in this session.</p>}
        </div>

        {/* CONTROL BAR — driven by roomRole */}
        <div className="flex flex-wrap items-center justify-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
          <ControlButton active={micOn} onClick={() => setMicOn(!micOn)} icon={micOn ? Mic : MicOff} label={micOn ? 'Mute' : 'Unmute'} />
          <ControlButton active={camOn} onClick={() => setCamOn(!camOn)} icon={camOn ? Video : VideoOff} label={camOn ? 'Stop Video' : 'Start Video'} />
          {isInstructor ? (
            <ControlButton active={false} onClick={() => {}} icon={ScreenShare} label="Share Screen" />
          ) : (
            <button
              onClick={toggleHand}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                isHandRaised ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Hand className="w-4 h-4" /> {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
            </button>
          )}
          <button className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-rose-600 text-white">
            <PhoneOff className="w-4 h-4" /> {isInstructor ? 'End Session' : 'Leave'}
          </button>
        </div>
      </div>

      {/* LIVE Q&A SIDEBAR */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[600px]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase text-slate-400 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Live Q&A
          </h4>
          <span className="text-[10px] text-slate-400">
            {liveMessages.length} {liveMessages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>

        {isInstructor && (
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-[11px]">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Hand className="w-3 h-3" /> Raised hands ({raisedHands.length})
            </span>
            <p className="text-slate-400">{raisedHands.length ? raisedHands.join(', ') : 'None right now'}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {liveMessages.map((m) => (
            <div key={m.id} className="text-xs flex gap-2">
              <Avatar name={m.author} src={m.avatarUrl} size="sm" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${m.role === 'instructor' ? 'text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>{m.author}</span>
                  {m.role === 'instructor' && <span className="text-[9px] uppercase font-bold px-1.5 rounded bg-indigo-500/10 text-indigo-400">Host</span>}
                  <span className="text-[10px] text-slate-500 ml-auto">{m.ts}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">{m.text}</p>
              </div>
            </div>
          ))}
          {liveMessages.length === 0 && <p className="text-xs text-slate-400">No questions yet.</p>}
          <div ref={chatEndRef} />
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={isInstructor ? 'Answer or announce…' : 'Ask a question…'}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
          />
          <button onClick={sendMessage} aria-label="Send message" className="px-3 py-2 bg-indigo-600 text-white rounded-xl">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UserBadge({ user, onSignOut }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <Avatar name={user.name} src={user.avatarUrl} size="md" />
      <div className="text-right leading-tight">
        <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
        <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
          <span>{user.role === 'instructor' ? 'Instructor / Faculty' : 'Student'}</span> • {user.institution}
          {user.verified ? (
            <ShieldCheck className="w-3 h-3 text-emerald-400" aria-label="Verified" />
          ) : (
            <ShieldAlert className="w-3 h-3 text-amber-400" aria-label="Unverified" />
          )}
        </p>
      </div>
      <button onClick={onSignOut} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title="Sign out" aria-label="Sign out">
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, action, tone }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2">
      <Icon className={`w-8 h-8 mx-auto ${tone === 'locked' ? 'text-rose-400' : 'text-slate-500'}`} />
      <p className="font-bold text-sm text-slate-900 dark:text-white">{title}</p>
      <p className="text-xs text-slate-400 max-w-md mx-auto">{body}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

function ControlButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
        active ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
