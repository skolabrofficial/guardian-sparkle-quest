import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import CourseForum from '@/components/CourseForum';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { nameWithRole } from '@/lib/roleUtils';
import ChangeHistory from '@/components/ChangeHistory';

interface Course {
  id: string; title: string; description: string | null; day_of_week: string | null;
  time_slot: string | null; difficulty: string | null; lektor_id: string | null;
  faculty_id: string | null; max_students: number | null;
  room?: string | null; building?: string | null; semester?: string | null;
  credits?: number | null; prerequisites?: string | null; syllabus?: string | null;
  exam_type?: string | null; language?: string | null; capacity_note?: string | null;
  schedule_note?: string | null;
}

export default function KurzDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [allCourses, setAllCourses] = useState<{ id: string; title: string }[]>([]);
  const [lektorName, setLektorName] = useState<string | null>(null);
  const [lektorRole, setLektorRole] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollCount, setEnrollCount] = useState(0);
  const [facultyDeanId, setFacultyDeanId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    loadCourse();
  }, [user, id]);

  const loadCourse = async () => {
    if (!id) return;
    const [courseRes, allRes] = await Promise.all([
      supabase.from('courses').select('*').eq('id', id).single(),
      supabase.from('courses').select('id, title').eq('is_active', true),
    ]);
    if (courseRes.data) {
      setCourse(courseRes.data);
      if (courseRes.data.lektor_id) {
        const [profRes, roleRes] = await Promise.all([
          supabase.from('profiles').select('display_name').eq('user_id', courseRes.data.lektor_id).single(),
          supabase.from('user_roles').select('role').eq('user_id', courseRes.data.lektor_id).single(),
        ]);
        if (profRes.data) setLektorName(profRes.data.display_name);
        if (roleRes.data) setLektorRole(roleRes.data.role);
      }
      if (courseRes.data.faculty_id) {
        const { data: fac } = await supabase.from('faculties').select('dean_id').eq('id', courseRes.data.faculty_id).single();
        if (fac) setFacultyDeanId(fac.dean_id);
      }
    }
    if (allRes.data) setAllCourses(allRes.data);
    if (user) {
      const { data: enr } = await supabase.from('enrollments').select('id').eq('course_id', id).eq('student_id', user.id).maybeSingle();
      setEnrolled(!!enr);
    }
    const { count } = await supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('course_id', id);
    setEnrollCount(count || 0);
  };

  const toggleEnroll = async () => {
    if (!user || !id) return;
    if (enrolled) {
      await supabase.from('enrollments').delete().eq('course_id', id).eq('student_id', user.id);
    } else {
      await supabase.from('enrollments').insert({ course_id: id, student_id: user.id });
    }
    loadCourse();
  };

  if (!course) return <AppLayout><div className="panel-card"><p>Načítání kurzu...</p></div></AppLayout>;

  return (
    <AppLayout searchLabel="Kurz" searchPlaceholder="Hledat v kurzu...">
      <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
        <div className="grid gap-[18px]">
          <article className="feature-card animate-float-in">
            <Link to="/kurzy" className="text-xs text-muted-foreground no-underline mb-2 block hover:text-primary transition-colors">← Zpět na kurzy</Link>
            <h2 className="mt-0 text-[22px]">{course.title}</h2>
            {course.description && <p>{course.description}</p>}
            <div className="flex flex-wrap gap-3 mt-3 text-sm">
              {course.day_of_week && <span className="px-2.5 py-1.5 rounded-full font-bold bg-muted text-foreground">{course.day_of_week} {course.time_slot}</span>}
              {course.difficulty && <span className="px-2.5 py-1.5 rounded-full font-bold bg-accent/10 text-accent">{course.difficulty}</span>}
              {lektorName && <span className="px-2.5 py-1.5 rounded-full font-bold" style={{ background: '#fff8e0', color: '#8b6914' }}>👨‍🏫 {nameWithRole(lektorName, lektorRole)}</span>}
              <span className="px-2.5 py-1.5 rounded-full font-bold bg-muted text-foreground">{enrollCount}/{course.max_students || '∞'} studentů</span>
            </div>
          </article>

          <CourseForum courseId={course.id} courseName={course.title} allCourses={allCourses} facultyDeanId={facultyDeanId} />
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card animate-slide-up stagger-1">
            <h4 className="mt-0">Zápis do kurzu</h4>
            <button onClick={toggleEnroll} className={`${enrolled ? 'btn-alik-outline' : 'btn-alik-accent'} w-full`}>
              {enrolled ? 'Odhlásit se z kurzu' : 'Zapsat se do kurzu'}
            </button>
          </div>
          <div className="panel-card animate-slide-up stagger-2">
            <h4 className="mt-0">Informace</h4>
            <ul className="pl-4 text-sm space-y-1">
              <li>Den: {course.day_of_week || '—'}</li>
              <li>Čas: {course.time_slot || '—'}</li>
              <li>Obtížnost: {course.difficulty || '—'}</li>
              <li>Lektor: {lektorName ? nameWithRole(lektorName, lektorRole) : '—'}</li>
              {course.room && <li>Místnost: {course.room}</li>}
              {course.building && <li>Budova: {course.building}</li>}
              {course.semester && <li>Semestr: {course.semester}</li>}
              {(course.credits ?? 0) > 0 && <li>Kredity: {course.credits}</li>}
              {course.exam_type && course.exam_type !== 'žádný' && <li>Zkouška: {course.exam_type}</li>}
              {course.language && <li>Jazyk: {course.language}</li>}
              {course.prerequisites && <li>Prerekvizity: {course.prerequisites}</li>}
              {course.schedule_note && <li>📅 {course.schedule_note}</li>}
              {course.capacity_note && <li>👥 {course.capacity_note}</li>}
            </ul>
            {course.syllabus && (
              <div className="mt-3 border-t border-border pt-2">
                <h5 className="text-xs font-bold uppercase text-muted-foreground mb-1">Sylabus</h5>
                <p className="text-xs text-muted-foreground">{course.syllabus}</p>
              </div>
            )}
          </div>
          <ChangeHistory entityType="course" entityId={course.id} authorId={course.lektor_id || undefined} />
        </aside>
      </main>
    </AppLayout>
  );
}
