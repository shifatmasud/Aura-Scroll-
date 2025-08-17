import React, { forwardRef, useImperativeHandle, useRef } from 'react';

export interface PageIndicatorHandles {
  rootRef: React.RefObject<HTMLDivElement>;
  tensRef: React.RefObject<HTMLSpanElement>;
  unitsRef: React.RefObject<HTMLSpanElement>;
}

const DigitStrip: React.FC<{ digitRef: React.RefObject<HTMLSpanElement> }> = ({ digitRef }) => (
  <span ref={digitRef} className="inline-block">
    {[...Array(10)].map((_, i) => (
      <span key={i} className="block h-[20px] leading-[20px]">{i}</span>
    ))}
  </span>
);

const PageIndicator = forwardRef<PageIndicatorHandles, {}>((props, ref) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const tensRef = useRef<HTMLSpanElement>(null);
  const unitsRef = useRef<HTMLSpanElement>(null);
  const digitHeight = 20; // Must match the height in DigitStrip

  useImperativeHandle(ref, () => ({
    rootRef,
    tensRef,
    unitsRef,
  }));

  return (
    <div id="page-indicator" ref={rootRef} className="fixed right-[5%] bottom-[7em] z-30 text-[clamp(0.66rem,2vw,1rem)] tracking-[0.2em]">
      <span style={{ height: `${digitHeight}px` }} className="inline-block overflow-hidden align-top">
        <DigitStrip digitRef={tensRef} />
      </span>
      <span style={{ height: `${digitHeight}px` }} className="inline-block overflow-hidden align-top">
        <DigitStrip digitRef={unitsRef} />
      </span>
    </div>
  );
});

PageIndicator.displayName = 'PageIndicator';

export default PageIndicator;