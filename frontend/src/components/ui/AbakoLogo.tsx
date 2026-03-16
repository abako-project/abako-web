import * as React from 'react';
import { cn } from '@lib/cn';

export interface AbakoLogoProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
  color?: string;
}

const AbakoLogo = React.forwardRef<SVGSVGElement, AbakoLogoProps>(
  ({ className, size = 24, color = '#36D399', ...props }, ref) => {
    const aspectRatio = 310 / 123.4;
    const width = size * aspectRatio;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 310 123.4"
        width={width}
        height={size}
        fill={color}
        className={cn('inline-block', className)}
        aria-label="Abako Logo"
        role="img"
        {...props}
      >
        {/* Left part - "W" strokes */}
        <g transform="translate(0, 11.5)">
          <path d="M16.1366 0H70.8272C70.8272 0 133.885 5.60515 133.885 67.2618L133.885 83.4883C133.885 100.234 112.559 106.516 103.213 93.553C102.836 93.0305 102.479 92.4768 102.143 91.8912L100.22 88.5354C97.0574 84.0093 91.8655 81.2747 86.2861 81.2747H41.8273C35.848 81.2747 30.4082 77.8168 27.8704 72.4028C23.0791 62.1813 30.5386 50.4463 41.8273 50.4463H56.8144H81.8148C88.4621 50.4463 92.8704 43.5564 90.0849 37.521C88.5961 34.2953 85.3676 32.2296 81.8148 32.2296H16.1366C10.1327 32.2296 4.62661 28.8919 1.84942 23.569C-3.74815 12.8403 4.03542 0 16.1366 0Z" />
        </g>
        {/* Right part - First "3" shape */}
        <g transform="translate(144, 0)">
          <path d="M33.4896 0H17.0224C4.3268 0 -3.88918 13.4106 1.877 24.7212L47.436 114.087C53.6583 126.292 71.0221 126.501 77.5365 114.45L85.9308 98.9202C88.5837 94.0123 88.6596 88.1152 86.1341 83.1406L48.6479 9.30423C45.75 3.59616 39.8911 0 33.4896 0Z" />
        </g>
        {/* Right part - Second "3" shape */}
        <g transform="translate(222, 0)">
          <path d="M33.4896 0H17.0224C4.3268 0 -3.88918 13.4106 1.877 24.7212L47.436 114.087C53.6583 126.292 71.0221 126.501 77.5365 114.45L85.9308 98.9202C88.5837 94.0123 88.6596 88.1152 86.1341 83.1406L48.6479 9.30423C45.75 3.59616 39.8911 0 33.4896 0Z" />
        </g>
      </svg>
    );
  }
);

AbakoLogo.displayName = 'AbakoLogo';

export { AbakoLogo };
