export default function BrandLogo({ className = "", tone = "dark" }) {
  return (
    <span className={`taskr-wordmark taskr-wordmark-${tone} ${className}`}>
      <img src="/taskr-wordmark.png" alt="TASKR" />
    </span>
  );
}
