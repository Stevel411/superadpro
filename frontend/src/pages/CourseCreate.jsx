import { useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui';
import { PenLine, BookOpen, CheckCircle, Send } from 'lucide-react';

export default function CourseCreate() {
  return (
    <AppLayout title="Create Your Course" subtitle="Course Marketplace — Build, publish, and earn">
      <div className="max-w-2xl mx-auto">
        {/* Overview */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎓</div>
          <h2 className="font-display text-2xl font-extrabold text-slate-800 mb-2">Create & Sell Your Own Course</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            As a Pro member, you can create courses and sell them on the marketplace. You keep 50% of every sale.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4 mb-8">
          <StepCard step="1" icon={<PenLine className="w-5 h-5" />} title="Course Details"
            desc="Add your title, description, price, category, and thumbnail image." />
          <StepCard step="2" icon={<BookOpen className="w-5 h-5" />} title="Chapters & Lessons"
            desc="Organise your content into chapters. Add video, text, or PDF lessons." />
          <StepCard step="3" icon={<CheckCircle className="w-5 h-5" />} title="Quality Review"
            desc="Check your course meets the quality standards, then submit for review." />
          <StepCard step="4" icon={<Send className="w-5 h-5" />} title="Publish & Earn"
            desc="Once approved, your course goes live on the marketplace. Earn 50% of every sale." />
        </div>

        {/* Launch Button */}
        <div className="text-center">
          <a href="/courses/create" className="no-underline">
            <Button size="lg">
              <PenLine className="w-4 h-4" /> Launch Course Builder
            </Button>
          </a>
          <p className="text-xs text-slate-400 mt-3">Opens the full course creation wizard</p>
        </div>
      </div>
    </AppLayout>
  );
}

function StepCard({ step, icon, title, desc }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
      <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center text-cyan shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xs text-slate-400 font-bold mb-0.5">Step {step}</div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
