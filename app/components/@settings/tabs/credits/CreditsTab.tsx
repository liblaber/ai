import { useCreditsStore } from '~/lib/stores/credits';

export default function CreditsTab() {
  const { usedCredits, maxCreditsPerDay } = useCreditsStore();
  const remainingCredits = maxCreditsPerDay - usedCredits;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-2">
        <h2 className="text-lg font-medium text-liblab-elements-textPrimary">Credits</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-white/30 rounded-lg p-6 bg-transparent">
          <div className="space-y-2">
            <div className="text-2xl font-semibold text-white">{remainingCredits} available</div>
          </div>
        </div>
        <div className="border border-white/30 rounded-lg p-6 bg-transparent">
          <div className="space-y-2">
            <div className="text-2xl font-semibold text-white">{usedCredits} used</div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-liblab-elements-textSecondary text-sm">
          You have a daily limit of {maxCreditsPerDay} tokens. Your tokens will automatically refresh every day.
        </p>
        <p className="text-liblab-elements-textSecondary text-sm">
          To purchase additional tokens, please contact us at{' '}
          <a href="mailto:contact@liblab.ai" className="text-accent-400 hover:text-accent-300 transition-colors">
            contact@liblab.ai
          </a>
        </p>
      </div>
    </div>
  );
}
