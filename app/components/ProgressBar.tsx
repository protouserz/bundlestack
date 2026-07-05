import styles from "./ui.module.css";

type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={styles.progressTrack}
    >
      <div className={styles.progressFill} style={{ width: `${value}%` }} />
    </div>
  );
}
