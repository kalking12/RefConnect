export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <picture className="block shrink-0">
      <source srcSet="/brand/refconnect-mark.webp" type="image/webp" />
      <img
        src="/brand/refconnect-mark.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        className={`block shrink-0 object-contain ${className}`}
      />
    </picture>
  );
}

export function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <img
      src="/brand/refconnect-logo.png"
      alt="RefConnect"
      draggable={false}
      className={`block shrink-0 object-cover object-center ${className}`}
    />
  );
}
