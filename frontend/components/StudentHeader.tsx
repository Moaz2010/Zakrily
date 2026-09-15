import styles from "./StudentHeader.module.css";

export function StudentHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.student}>
        <span className={styles.avatar} aria-hidden="true">
          <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><circle cx="20" cy="12" r="7" /><path d="M9 34v-3a11 11 0 0 1 22 0v3" /></svg>
        </span>
        <div><p className={styles.name}>سلمى مدحت</p><p className={styles.grade}>رابعة ابتدائي</p></div>
      </div>
      <div className={styles.streak} dir="ltr" aria-label="سلسلة الدراسة: 20 يومًا"><span aria-hidden="true">🔥</span><strong>20</strong></div>
    </header>
  );
}
