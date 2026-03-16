/**
 * SettingsPage - Placeholder for user settings
 */
export default function SettingsPage() {
  return (
    <div className="px-8 lg:px-[var(--spacing-17,56px)] py-10">
      <h1 className="text-[30px] font-bold leading-[42px] text-[var(--text-dark-primary,#f5f5f5)] mb-4">
        Settings
      </h1>
      <div className="rounded-[var(--radi-6,12px)] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] p-8">
        <div className="flex items-center gap-3 text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
          <i className="ri-settings-line text-2xl" />
          <p className="text-sm">Settings will be available soon.</p>
        </div>
      </div>
    </div>
  );
}
