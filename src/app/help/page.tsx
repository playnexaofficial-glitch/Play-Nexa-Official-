// src/app/help/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Play Nexa কি?',
    a: 'Play Nexa একটি ফ্রি অ্যাপ যেখানে তুমি মুভি দেখতে, গান শুনতে, গেম খেলতে এবং ভিডিও ডাউনলোড করতে পারবে — সব এক জায়গায়।',
  },
  {
    q: 'এটা কি সত্যিই ফ্রি?',
    a: 'হ্যাঁ, সম্পূর্ণ ফ্রি। কোনো subscription, কোনো hidden charge নেই।',
  },
  {
    q: 'অফলাইনে কি ব্যবহার করা যায়?',
    a: 'হ্যাঁ। ডাউনলোড করা মুভি/গান/গেম অফলাইনে চলবে। শুধু নতুন কন্টেন্ট লোড করতে ইন্টারনেট লাগবে।',
  },
  {
    q: 'আমার ডাটা কি সেফ?',
    a: 'তোমার সব ডাটা তোমার ডিভাইসে বা তোমার নিজের অ্যাকাউন্টে থাকে। আমরা কিছু sell করি না।',
  },
  {
    q: 'কিভাবে আপডেট করব?',
    a: 'Play Store থেকে অটো-আপডেট চালু রাখো। নতুন ফিচার নিয়মিত আসে।',
  },
];

export default function HelpPage() {
  const router = useRouter();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="w-9 h-9 flex items-center justify-center text-white active:opacity-70"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="text-white font-bold text-xl">Help &amp; Support</h1>
      </div>

      <div className="px-5 space-y-4">
        {/* Contact card */}
        <div className="bg-[#141414] border border-[#1E1E1E] rounded-2xl p-4">
          <p className="text-white font-semibold text-sm mb-1">Need help?</p>
          <p className="text-[#9CA3AF] text-xs mb-3">
            কোনো সমস্যা হলে আমাদের ইমেইল করো। আমরা 24 ঘন্টার মধ্যে উত্তর দেওয়ার চেষ্টা করি।
          </p>
          <a
            href="mailto:support@playnexa.app"
            className="inline-flex items-center gap-2 h-11 px-5 bg-[#7C3AED] rounded-xl text-white text-sm font-medium active:opacity-80"
          >
            ✉️ Email Support
          </a>
        </div>

        {/* FAQ */}
        <div>
          <p className="text-white font-semibold text-sm mb-3">Frequently Asked</p>
          <div className="bg-[#141414] border border-[#1E1E1E] rounded-2xl overflow-hidden">
            {FAQS.map((faq, i) => (
              <div
                key={faq.q}
                className={`${i < FAQS.length - 1 ? 'border-b border-[#1E1E1E]' : ''}`}
              >
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-4 min-h-[52px] text-left active:bg-[#1A1A1A]"
                >
                  <span className="flex-1 text-white text-sm font-medium">{faq.q}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6B7280"
                    strokeWidth="2"
                    style={{
                      transform: openIdx === i ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 200ms',
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openIdx === i && (
                  <div className="px-4 pb-4">
                    <p className="text-[#9CA3AF] text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="bg-[#141414] border border-[#1E1E1E] rounded-2xl p-4">
          <p className="text-white font-semibold text-sm mb-1">About Play Nexa</p>
          <p className="text-[#9CA3AF] text-xs leading-relaxed">
            Version 1.0.0 • 100% Free • No Ads • No Subscription
          </p>
          <p className="text-[#9CA3AF] text-xs leading-relaxed mt-2">
            Made with ❤️ for entertainment lovers everywhere.
          </p>
        </div>
      </div>
    </div>
  );
}
