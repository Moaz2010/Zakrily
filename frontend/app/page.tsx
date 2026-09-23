"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HeroVideo } from "@/components/HeroVideo";
import styles from "./landing.module.css";

const HERO_VIDEO_ID = "Yhtkcu3eHQs";

const FEATURES = [
  {
    icon: "🗺️",
    accent: "var(--color-teal)",
    title: "مسار تعلّم خطوة بخطوة",
    body: "كل مادة مقسّمة لدروس مرتّبة، والدرس الجديد يفتح لما تخلّص اللي قبله. عشان ما حدش يتوه.",
  },
  {
    icon: "✨",
    accent: "var(--color-science)",
    title: "نوّارة تشرحلك بالمصري",
    body: "مدرّسة ذكية بتشرح أي حاجة مش فاهمها من نفس الدرس، بالعامية المصرية، في أي وقت.",
  },
  {
    icon: "🎯",
    accent: "var(--color-math)",
    title: "تدريبات على نقط ضعفك",
    body: "بنحلّل إجاباتك ونعرف مهاراتك الضعيفة، وبنجيبلك أسئلة تركّز عليها بالظبط.",
  },
  {
    icon: "🎤",
    accent: "var(--color-english)",
    title: "تدرّب على النطق بصوتك",
    body: "اتكلم إنجليزي وطبّق اللي اتعلمته، والتطبيق يسمعك ويصحّحلك.",
  },
  {
    icon: "🏅",
    accent: "var(--color-amber)",
    title: "نقاط وشارات تشجّعك",
    body: "كل بطاقة بتخلّصها وكل إجابة صح بتكسّبك نقاط، والنقاط بتتحوّل لشارات وخصومات.",
  },
];

const SUBJECTS = [
  { icon: "🔬", name: "العلوم", meta: "٥ دروس", bg: "var(--color-science)" },
  { icon: "🔢", name: "الرياضيات", meta: "٨ دروس", bg: "var(--color-math)" },
  { icon: "🔤", name: "الإنجليزي", meta: "٣ دروس", bg: "var(--color-english)" },
];

const STEPS = [
  { title: "اعمل حساب في ثانية", body: "اسمك وبريدك وكلمة سر، وخلاص. من غير أي تعقيد." },
  { title: "اختار مادتك وابدأ الدرس", body: "اقرأ البطاقات القصيرة، واسأل نوّارة أي وقت تلخبط فيه." },
  { title: "حل التدريبات", body: "أسئلة متدرّجة على الدرس، وتصحيح فوري يوضّحلك غلطك." },
  { title: "شوف تقدمك يكبر", body: "نقاطك ونسبة دقتك وأيام مذاكرتك المتواصلة قدامك دايمًا." },
];

export default function LandingPage() {
  const router = useRouter();

  // Someone already signed in should land in the app, not on the pitch.
  // The page still renders its full markup rather than gating behind a
  // loading flag: this is the public marketing page, so it has to be in the
  // server-rendered HTML for crawlers and to avoid a blank first paint. The
  // redirect just moves a signed-in visitor along a moment later.
  useEffect(() => {
    try {
      if (localStorage.getItem("zakrely_token")) router.replace("/home");
    } catch {
      // Private mode or blocked storage: just show the landing page.
    }
  }, [router]);

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.bar}>
          <div className={styles.brand}>
            <Image src="/Zakrily Logo.png" alt="ذاكريلي" width={40} height={40} className={styles.mark} priority />
            <strong>ذاكريلي</strong>
          </div>
          <Link href="/home" className={styles.signIn}>تسجيل الدخول</Link>
        </header>

        <section className={styles.hero}>
          <span className={styles.badge}>
            <span className={styles.pulse} aria-hidden="true"><i /><b /></span>
            الصف الرابع الابتدائي · الترم الأول
          </span>

          <h1>مذاكرة ابنك بقت <em>أسهل وأمتع</em></h1>
          <p className={styles.lede}>
            منهج العلوم والرياضيات والإنجليزي، مشروح بالعامية المصرية،
            مع مدرّسة ذكية بترد على أسئلته في أي وقت.
          </p>

          <div className={styles.videoWrap}>
            <HeroVideo youtubeId={HERO_VIDEO_ID} title="تعرّف على ذاكريلي" />
          </div>

          <div className={styles.cta}>
            <Link href="/home" className={styles.primary}>ابدأ مجانًا دلوقتي</Link>
            <a href="#features" className={styles.secondary}>شوف إيه اللي جواه</a>
          </div>
          <p className={styles.reassure}>من غير كارت ائتمان · الحساب بيتعمل في أقل من دقيقة</p>

          <div className={styles.stats}>
            <div className={styles.stat}><strong>٣</strong><span>مواد دراسية</span></div>
            <div className={styles.stat}><strong>١٦</strong><span>درس كامل</span></div>
            <div className={styles.stat}><strong>٣٠٠+</strong><span>سؤال وتدريب</span></div>
          </div>
        </section>

        <section className={styles.section} id="features">
          <span className={styles.eyebrow}>ليه ذاكريلي؟</span>
          <h2>مش مجرد فيديوهات، ده مدرّس بيتابع معاه</h2>
          <p>كل حاجة هنا مبنية على منهج الوزارة، ومصمّمة عشان الطفل يفهم بنفسه من غير ما حد يقعد جنبه.</p>

          <div className={styles.features}>
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className={styles.feature}
                style={{ "--accent": feature.accent } as React.CSSProperties}
              >
                <span className={styles.icon} aria-hidden="true">{feature.icon}</span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.eyebrow}>المواد المتاحة</span>
          <h2>منهج الترم الأول كامل</h2>
          <div className={styles.subjects}>
            {SUBJECTS.map((subject) => (
              <div key={subject.name} className={styles.subject} style={{ background: subject.bg }}>
                <span aria-hidden="true">{subject.icon}</span>
                <strong>{subject.name}</strong>
                <small>{subject.meta}</small>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.eyebrow}>إزاي بيشتغل؟</span>
          <h2>أربع خطوات وابنك بيذاكر لوحده</h2>
          <div className={styles.steps}>
            {STEPS.map((step, index) => (
              <div key={step.title} className={styles.step}>
                <div className={styles.rail}>
                  <span className={styles.num}>{index + 1}</span>
                  <span className={styles.line} />
                </div>
                <div className={styles.stepBody}>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.closing}>
          <div className={styles.petals} aria-hidden="true"><img src="/petals-diagonal.png" alt="" /></div>
          <h2>جاهز تبدأ؟</h2>
          <p>اعمل حساب دلوقتي وابنك يبدأ أول درس في خلال دقيقة.</p>
          <Link href="/home" className={styles.primary}>ابدأ مجانًا</Link>
        </section>

        <footer className={styles.footer}>
          ذاكريلي — مذاكرة أسهل لطلبة رابعة ابتدائي
        </footer>
      </div>
    </div>
  );
}
