/**
 * InfoItem - Shared icon + text row used inside profile cards.
 *
 * Used by both DeveloperProfilePage and ClientProfilePage in their show-mode
 * profile card info list. Extracted to avoid duplication.
 *
 * Visual spec (Figma node 1350:15713):
 *   - Icon: 24px, text-dark-primary
 *   - Text: 14px medium, leading-[22px], text-dark-primary
 *   - Gap: 13px
 */

export interface InfoItemProps {
  icon: string;
  text: string;
}

export function InfoItem({ icon, text }: InfoItemProps) {
  return (
    <div className="flex items-center gap-[13px]">
      <i className={`${icon} text-2xl leading-none text-[var(--text-dark-primary,#f5f5f5)]`} />
      <span className="text-sm font-medium leading-[22px] text-[var(--text-dark-primary,#f5f5f5)]">
        {text}
      </span>
    </div>
  );
}
