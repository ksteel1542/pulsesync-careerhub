import React, { useState } from 'react';
import {
  ClipboardList, Plus, Trash2, CheckCircle2, XCircle, Award, RotateCcw, ArrowLeft, AlertCircle, ListChecks, Users,
} from 'lucide-react';
import { useClassroomStore } from '../../state/classroomContext';
import { scoreQuiz } from '../../lib/quizScoring';

const LETTERS = ['A', 'B', 'C', 'D'];

const inputCls =
  'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500';

const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5';

const blankQuestion = () => ({
  id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  text: '',
  options: { A: '', B: '', C: '', D: '' },
  correct: 'A',
  points: 1,
});

const totalPoints = (quiz) => quiz.questions.reduce((s, q) => s + q.points, 0);

export default function QuizEngine({ course, user, roomRole, hostableCourses }) {
  const { quizzes } = useClassroomStore();
  const courseQuizzes = quizzes.filter((q) => q.courseId === course.id);

  return roomRole === 'instructor' ? (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7">
        <QuizCreator course={course} user={user} hostableCourses={hostableCourses} />
      </div>
      <div className="lg:col-span-5">
        <PublishedQuizzes quizzes={courseQuizzes} course={course} />
      </div>
    </div>
  ) : (
    <StudentQuizzes quizzes={courseQuizzes} course={course} user={user} />
  );
}

// ---------------------------------------------------------------------------
// Instructor: quiz creator
// ---------------------------------------------------------------------------
function QuizCreator({ course, user, hostableCourses }) {
  const { addQuiz } = useClassroomStore();
  const [targetCourseId, setTargetCourseId] = useState(course.id);
  const targetCourse = hostableCourses.find((c) => c.id === targetCourseId) ?? course;
  const [title, setTitle] = useState('');
  const [passMark, setPassMark] = useState(70);
  const [questions, setQuestions] = useState([blankQuestion()]);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');

  const update = (id, patch) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const updateOption = (id, letter, value) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, options: { ...q.options, [letter]: value } } : q)));

  const validate = () => {
    const errs = [];
    if (!title.trim()) errs.push('Quiz title is required.');
    if (!(passMark >= 1 && passMark <= 100)) errs.push('Pass mark must be between 1 and 100.');
    questions.forEach((q, i) => {
      const n = i + 1;
      if (!q.text.trim()) errs.push(`Question ${n}: enter the question text.`);
      const missing = LETTERS.filter((l) => !q.options[l].trim());
      if (missing.length) errs.push(`Question ${n}: fill in option${missing.length > 1 ? 's' : ''} ${missing.join(', ')}.`);
      if (!Number.isInteger(q.points) || q.points < 1) errs.push(`Question ${n}: points must be a whole number of at least 1.`);
    });
    return errs;
  };

  const publish = (e) => {
    e.preventDefault();
    setNotice('');
    const errs = validate();
    setErrors(errs);
    if (errs.length) return;
    addQuiz({
      courseId: targetCourse.id,
      title: title.trim(),
      passMark,
      createdBy: user.name,
      questions: questions.map((q) => ({
        ...q,
        text: q.text.trim(),
        options: Object.fromEntries(LETTERS.map((l) => [l, q.options[l].trim()])),
      })),
    });
    setNotice(`“${title.trim()}” published to ${targetCourse.code}.`);
    setTitle('');
    setPassMark(70);
    setQuestions([blankQuestion()]);
  };

  return (
    <form onSubmit={publish} noValidate className={`${card} space-y-4`}>
      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-indigo-500" /> Quiz Creator
      </h4>

      <label className="block">
        <span className="text-[11px] text-slate-400 block mb-1">Target course</span>
        <select value={targetCourseId} onChange={(e) => setTargetCourseId(e.target.value)} className={inputCls}>
          {hostableCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.title}{c.facultyEmails.includes(user.email) ? ' (assigned to you)' : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <label className="block sm:col-span-3">
          <span className="text-[11px] text-slate-400 block mb-1">Quiz title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Week 8 Checkpoint" />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-400 block mb-1">Pass mark (%)</span>
          <input type="number" min={1} max={100} value={passMark} onChange={(e) => setPassMark(Number(e.target.value))} className={inputCls} />
        </label>
      </div>

      {questions.map((q, i) => (
        <fieldset key={q.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <legend className="text-xs font-bold text-indigo-400">Question {i + 1}</legend>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
                aria-label={`Remove question ${i + 1}`}
                className="p-1 rounded text-slate-400 hover:text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <input value={q.text} onChange={(e) => update(q.id, { text: e.target.value })} className={inputCls} placeholder="Question text" aria-label={`Question ${i + 1} text`} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LETTERS.map((l) => (
              <label key={l} className="flex items-center gap-2">
                <span className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-[11px] font-black ${q.correct === l ? 'bg-emerald-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  {l}
                </span>
                <input value={q.options[l]} onChange={(e) => updateOption(q.id, l, e.target.value)} className={inputCls} placeholder={`Option ${l}`} aria-label={`Question ${i + 1} option ${l}`} />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-[11px] text-slate-400">
              Correct answer
              <select value={q.correct} onChange={(e) => update(q.id, { correct: e.target.value })} className={`${inputCls} w-auto`}>
                {LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-400">
              Points
              <input type="number" min={1} value={q.points} onChange={(e) => update(q.id, { points: Number(e.target.value) })} className={`${inputCls} w-20`} />
            </label>
          </div>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
        className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-400 flex items-center justify-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> Add Question
      </button>

      {errors.length > 0 && (
        <div role="alert" className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 space-y-0.5">
          {errors.map((e) => (
            <p key={e} className="flex items-start gap-1.5"><AlertCircle className="w-3 h-3 shrink-0 mt-px" /> {e}</p>
          ))}
        </div>
      )}
      {notice && <p role="status" className="text-[11px] text-emerald-400">{notice}</p>}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {questions.length} {questions.length === 1 ? 'question' : 'questions'} • {questions.reduce((s, q) => s + (q.points || 0), 0)} pts
        </span>
        <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold">
          Publish Quiz
        </button>
      </div>
    </form>
  );
}

function PublishedQuizzes({ quizzes, course }) {
  const { attempts, removeQuiz } = useClassroomStore();
  return (
    <div className={`${card} space-y-3`}>
      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-indigo-500" /> Published in {course.code}
      </h4>
      {quizzes.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No quizzes yet.</p>}
      {quizzes.map((q) => {
        const qa = attempts.filter((a) => a.quizId === q.id);
        const avg = qa.length ? Math.round(qa.reduce((s, a) => s + a.percentage, 0) / qa.length) : null;
        const passRate = qa.length ? Math.round((qa.filter((a) => a.passed).length / qa.length) * 100) : null;
        return (
          <div key={q.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{q.title}</p>
                <p className="text-[10px] text-slate-500">
                  {q.questions.length} questions • {totalPoints(q)} pts • pass {q.passMark}%
                </p>
              </div>
              <button onClick={() => removeQuiz(q.id)} aria-label={`Delete ${q.title}`} className="p-1 rounded text-slate-400 hover:text-rose-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {qa.length ? `${qa.length} ${qa.length === 1 ? 'attempt' : 'attempts'} • avg ${avg}% • ${passRate}% passed` : 'No attempts yet'}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Student: quiz list → quiz form → results
// ---------------------------------------------------------------------------
function StudentQuizzes({ quizzes, course, user }) {
  const { attempts } = useClassroomStore();
  const [activeQuizId, setActiveQuizId] = useState(null);
  const activeQuiz = quizzes.find((q) => q.id === activeQuizId);

  if (activeQuiz) {
    return <QuizTaker key={activeQuiz.id} quiz={activeQuiz} user={user} onExit={() => setActiveQuizId(null)} />;
  }

  return (
    <div className={`${card} space-y-3`}>
      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-indigo-500" /> {course.code} Assessments
      </h4>
      {quizzes.length === 0 && <p className="text-xs text-slate-400 py-6 text-center">No quizzes have been published for this course yet.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {quizzes.map((q) => {
          const mine = attempts.filter((a) => a.quizId === q.id && a.email === user.email);
          const best = mine.length ? Math.max(...mine.map((a) => a.percentage)) : null;
          return (
            <div key={q.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{q.title}</p>
              <p className="text-[11px] text-slate-500">
                {q.questions.length} questions • {totalPoints(q)} points • pass mark {q.passMark}% • by {q.createdBy}
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">{best === null ? 'Not attempted' : `Best score: ${best}%`}</span>
                <button onClick={() => setActiveQuizId(q.id)} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold">
                  {best === null ? 'Start Quiz' : 'Retake'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuizTaker({ quiz, user, onExit }) {
  const { recordAttempt } = useClassroomStore();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const answered = Object.keys(answers).length;
  const complete = answered === quiz.questions.length;

  const submit = (e) => {
    e.preventDefault();
    if (!complete) return;
    const r = scoreQuiz(quiz, answers);
    recordAttempt({ quizId: quiz.id, email: user.email, name: user.name, percentage: r.percentage, passed: r.passed });
    setResult(r);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (result) {
    return (
      <QuizResults
        quiz={quiz}
        result={result}
        onRetake={() => {
          setAnswers({});
          setResult(null);
        }}
        onExit={onExit}
      />
    );
  }

  return (
    <form onSubmit={submit} className={`${card} space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onExit} className="text-xs font-bold text-indigo-400 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> All quizzes
        </button>
        <span className="text-[11px] text-slate-400">
          {answered}/{quiz.questions.length} answered • pass mark {quiz.passMark}%
        </span>
      </div>
      <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{quiz.title}</h4>

      {quiz.questions.map((q, i) => (
        <fieldset key={q.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <legend className="sr-only">Question {i + 1}</legend>
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            {i + 1}. {q.text} <span className="text-[10px] font-semibold text-slate-500">({q.points} {q.points === 1 ? 'pt' : 'pts'})</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LETTERS.map((l) => {
              const checked = answers[q.id] === l;
              return (
                <label
                  key={l}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition ${
                    checked ? 'border-indigo-500 bg-indigo-500/10 text-slate-900 dark:text-white' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={l}
                    checked={checked}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: l }))}
                    className="accent-indigo-500"
                  />
                  <span className="font-bold">{l}.</span> {q.options[l]}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center justify-end gap-3">
        {!complete && <span className="text-[11px] text-amber-400">Answer every question to submit.</span>}
        <button type="submit" disabled={!complete} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed">
          Submit Quiz
        </button>
      </div>
    </form>
  );
}

function QuizResults({ quiz, result, onRetake, onExit }) {
  const { percentage, earnedPoints, totalPoints: total, passed, correctCount, incorrectCount, breakdown } = result;
  const correctPct = (correctCount / breakdown.length) * 100;

  return (
    <div className="space-y-4">
      <div className={`${card} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-bold">Results — {quiz.title}</p>
            <p className="text-4xl font-black text-slate-900 dark:text-white leading-tight">{percentage}%</p>
            <p className="text-xs text-slate-400">
              Total score: <span className="font-bold text-slate-700 dark:text-slate-200">{earnedPoints} / {total} points</span> • pass mark {quiz.passMark}%
            </p>
          </div>
          <span
            className={`px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 border ${
              passed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {passed ? <Award className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {passed ? 'PASSED' : 'FAILED'}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {correctCount} correct</span>
            <span className="text-rose-400 flex items-center gap-1">{incorrectCount} incorrect <XCircle className="w-3.5 h-3.5" /></span>
          </div>
          <div className="h-2 rounded-full bg-rose-500/30 overflow-hidden" role="img" aria-label={`${correctCount} of ${breakdown.length} answers correct`}>
            <div className="h-full bg-emerald-500" style={{ width: `${correctPct}%` }} />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onRetake} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Retake Quiz
          </button>
          <button onClick={onExit} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold">
            Back to Quizzes
          </button>
        </div>
      </div>

      <div className={`${card} space-y-2`}>
        <h5 className="text-xs font-bold uppercase text-slate-400">Answer breakdown</h5>
        {breakdown.map((b, i) => (
          <div key={b.id} className={`p-3 rounded-xl border text-xs ${b.isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
            <div className="flex items-start gap-2">
              {b.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              <div className="flex-1">
                <p className="font-bold text-slate-900 dark:text-white">{i + 1}. {b.text}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Your answer: <span className={b.isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{b.selected}. {b.options[b.selected]}</span>
                  {!b.isCorrect && (
                    <> • Correct: <span className="text-emerald-400 font-bold">{b.correct}. {b.options[b.correct]}</span></>
                  )}
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 shrink-0">{b.isCorrect ? b.points : 0}/{b.points} pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
