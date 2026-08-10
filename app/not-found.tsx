import Link from "next/link";

export default function NotFound() {
  return (
    <main className="px-4 py-24">
      <div className="max-w-md mx-auto text-center">
        <p className="text-gold tracking-widest text-sm mb-6">404</p>
        <h1 className="text-2xl font-bold mb-4">这条路上没有人</h1>
        <p className="text-ink/60 leading-relaxed mb-10 italic">
          &ldquo;迷路者也在路上。&rdquo;
          <br />
          <span className="not-italic text-sm text-ink/40">
            你要找的页面不存在，或者已经被移走了。
          </span>
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-ink text-parchment rounded-full hover:scale-105 transition-transform"
        >
          回到山下 →
        </Link>
      </div>
    </main>
  );
}
