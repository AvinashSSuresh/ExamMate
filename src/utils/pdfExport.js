import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';
import { formatDisplayDate, formatDisplayTime } from './dateUtils.js';

// Brand colours (RGB)
const COLOURS = {
  purple: [124, 58, 237],
  blue: [59, 130, 246],
  dark: [15, 23, 42],
  muted: [100, 116, 139],
  light: [241, 245, 249],
  white: [255, 255, 255],
};

const PAGE_MARGIN = 14;
const FOOTER_Y_OFFSET = 10;

// Adds a new page when the content would run past the bottom margin
function ensureSpace(doc, y, needed) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return PAGE_MARGIN + 6;
  }
  return y;
}

// Coloured heading bar used for each section
function sectionHeading(doc, y, title) {
  y = ensureSpace(doc, y, 16);
  doc.setFillColor(...COLOURS.purple);
  doc.roundedRect(PAGE_MARGIN, y, doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2, 9, 2, 2, 'F');
  doc.setTextColor(...COLOURS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, PAGE_MARGIN + 4, y + 6);
  return y + 15;
}

// Table header row
function tableHeader(doc, y, columns) {
  doc.setFillColor(...COLOURS.light);
  doc.rect(PAGE_MARGIN, y, doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2, 8, 'F');
  doc.setTextColor(...COLOURS.dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  columns.forEach((col) => doc.text(col.label, PAGE_MARGIN + 2 + col.x, y + 5.5));
  return y + 11;
}

// Writes one table row, adding a page if needed
function tableRow(doc, y, columns, values) {
  y = ensureSpace(doc, y, 8);
  doc.setTextColor(...COLOURS.dark);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  columns.forEach((col, i) => {
    const text = String(values[i] ?? '');
    const fitted = doc.splitTextToSize(text, col.width - 2)[0] || '';
    doc.text(fitted, PAGE_MARGIN + 2 + col.x, y);
  });
  doc.setDrawColor(...COLOURS.light);
  doc.line(PAGE_MARGIN, y + 2.5, doc.internal.pageSize.getWidth() - PAGE_MARGIN, y + 2.5);
  return y + 7;
}

// Progress bar drawn with two rectangles
function progressBar(doc, x, y, width, percent) {
  doc.setFillColor(...COLOURS.light);
  doc.roundedRect(x, y, width, 3, 1.5, 1.5, 'F');
  doc.setFillColor(...COLOURS.purple);
  doc.roundedRect(x, y, Math.max(0, (width * Math.min(percent, 100)) / 100), 3, 1.5, 1.5, 'F');
}

// Adds the footer with page numbers to every page once the document is complete
function addFooters(doc, studentName) {
  const pageCount = doc.internal.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(...COLOURS.muted);
    doc.text(`ExamMate · ${studentName}`, PAGE_MARGIN, height - FOOTER_Y_OFFSET);
    doc.text(`Page ${page} of ${pageCount}`, width - PAGE_MARGIN, height - FOOTER_Y_OFFSET, { align: 'right' });
  }
}

/**
 * Builds the complete study timetable PDF and triggers the download.
 *
 * @param {object} options
 * @param {string} options.studentName
 * @param {Array}  options.subjects   rows from the subjects table
 * @param {Array}  options.sessions   rows from listAllSessions (with subjects join)
 * @param {object} options.stats      { plannedHours, completedHours, remainingHours, overallPercent }
 * @param {Array}  options.progress   rows of { subjectId, name, percent, total, completed }
 */
export function downloadTimetablePdf({ studentName, subjects, sessions, stats, progress }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedOn = format(new Date(), 'dd MMM yyyy');

  // ---- Cover header ----
  doc.setFillColor(...COLOURS.dark);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setTextColor(...COLOURS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ExamMate', PAGE_MARGIN, 18);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Study Timetable', PAGE_MARGIN, 26);
  doc.setFontSize(10);
  doc.text(`Student: ${studentName || 'Student'}`, PAGE_MARGIN, 34);
  doc.text(`Generated on ${generatedOn}`, pageWidth - PAGE_MARGIN, 34, { align: 'right' });

  let y = 54;

  // ---- Preparation summary ----
  y = sectionHeading(doc, y, 'Preparation summary');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLOURS.dark);

  const summaryLines = [
    `Planned study hours: ${stats.plannedHours.toFixed(1)}`,
    `Completed hours: ${stats.completedHours.toFixed(1)}`,
    `Remaining hours: ${stats.remainingHours.toFixed(1)}`,
    `Overall progress: ${Math.round(stats.overallPercent)}%`,
  ];
  summaryLines.forEach((line, i) => doc.text(line, PAGE_MARGIN, y + i * 6));
  y += summaryLines.length * 6 + 4;
  progressBar(doc, PAGE_MARGIN, y, pageWidth - PAGE_MARGIN * 2, stats.overallPercent);
  y += 12;

  // ---- Subjects and exam dates ----
  y = sectionHeading(doc, y, 'Subjects and exam dates');
  const subjectColumns = [
    { label: 'Subject', x: 0, width: 62 },
    { label: 'Exam date', x: 62, width: 30 },
    { label: 'Time', x: 94, width: 22 },
    { label: 'Difficulty', x: 118, width: 26 },
    { label: 'Progress', x: 146, width: 30 },
  ];
  y = tableHeader(doc, y, subjectColumns);

  const sortedSubjects = [...subjects].sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  if (sortedSubjects.length === 0) {
    y = tableRow(doc, y, subjectColumns, ['No subjects added', '', '', '', '']);
  }
  for (const subject of sortedSubjects) {
    const progressRow = progress.find((p) => p.subjectId === subject.id);
    y = tableRow(doc, y, subjectColumns, [
      subject.subject_name,
      formatDisplayDate(subject.exam_date),
      subject.exam_time ? formatDisplayTime(subject.exam_time) : 'Not set',
      subject.difficulty,
      `${Math.round(progressRow?.percent ?? 0)}%`,
    ]);
  }
  y += 6;

  // ---- Subject progress ----
  y = sectionHeading(doc, y, 'Subject progress');
  for (const item of progress) {
    y = ensureSpace(doc, y, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOURS.dark);
    doc.text(`${item.name}`, PAGE_MARGIN, y);
    doc.text(`${item.completed} of ${item.total} sessions · ${Math.round(item.percent)}%`, pageWidth - PAGE_MARGIN, y, {
      align: 'right',
    });
    progressBar(doc, PAGE_MARGIN, y + 2, pageWidth - PAGE_MARGIN * 2, item.percent);
    y += 10;
  }
  y += 4;

  // ---- Daily sessions grouped by date ----
  const sessionColumns = [
    { label: 'Time', x: 0, width: 30 },
    { label: 'Subject', x: 30, width: 42 },
    { label: 'Topic', x: 72, width: 60 },
    { label: 'Type', x: 132, width: 24 },
    { label: 'Status', x: 156, width: 22 },
  ];

  y = sectionHeading(doc, y, 'Daily study sessions');

  const byDate = sessions.reduce((groups, session) => {
    (groups[session.session_date] ||= []).push(session);
    return groups;
  }, {});

  const dates = Object.keys(byDate).sort();
  if (dates.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLOURS.muted);
    doc.text('No sessions have been scheduled yet.', PAGE_MARGIN, y);
    y += 8;
  }

  for (const date of dates) {
    y = ensureSpace(doc, y, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOURS.purple);
    doc.text(formatDisplayDate(date), PAGE_MARGIN, y);
    y += 5;
    y = tableHeader(doc, y, sessionColumns);

    for (const session of byDate[date]) {
      y = tableRow(doc, y, sessionColumns, [
        `${formatDisplayTime(session.start_time)} - ${formatDisplayTime(session.end_time)}`,
        session.subjects?.subject_name || 'Subject',
        session.topic || '',
        session.session_type,
        session.status,
      ]);
    }
    y += 4;
  }

  // ---- Weekly overview (Monday to Sunday of the first scheduled week) ----
  if (dates.length > 0) {
    doc.addPage();
    y = PAGE_MARGIN + 6;
    y = sectionHeading(doc, y, 'Weekly overview');

    const weekColumns = [
      { label: 'Week of', x: 0, width: 40 },
      { label: 'Sessions', x: 40, width: 24 },
      { label: 'Study hours', x: 64, width: 30 },
      { label: 'Days used', x: 94, width: 26 },
    ];
    y = tableHeader(doc, y, weekColumns);

    const weeks = {};
    for (const session of sessions) {
      const weekStart = startOfIsoWeek(parseISO(session.session_date));
      const key = format(weekStart, 'yyyy-MM-dd');
      const entry = (weeks[key] ||= { sessions: 0, minutes: 0, days: new Set() });
      entry.sessions += 1;
      entry.minutes += session.duration;
      entry.days.add(session.session_date);
    }

    for (const key of Object.keys(weeks).sort()) {
      const entry = weeks[key];
      y = tableRow(doc, y, weekColumns, [
        formatDisplayDate(key),
        entry.sessions,
        (entry.minutes / 60).toFixed(1),
        entry.days.size,
      ]);
    }
  }

  addFooters(doc, studentName || 'Student');

  const safeName = (studentName || 'student').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  doc.save(`exammate-timetable-${safeName}.pdf`);
}

// Monday of the ISO week containing the given date
function startOfIsoWeek(date) {
  const day = date.getDay() === 0 ? 7 : date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}