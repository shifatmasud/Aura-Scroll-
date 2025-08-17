import React from 'react';
import type { SectionData } from '../types';

interface SectionProps {
  section: SectionData;
  index: number;
  setSectionRef: (el: HTMLElement | null, index: number) => void;
  setImageRef: (el: HTMLDivElement | null, index: number) => void;
  setHeadingRef: (el: HTMLHeadingElement | null, index: number) => void;
  setOuterWrapperRef: (el: HTMLDivElement | null, index: number) => void;
  setInnerWrapperRef: (el: HTMLDivElement | null, index: number) => void;
}

const Section: React.FC<SectionProps> = ({
  section,
  index,
  setSectionRef,
  setImageRef,
  setHeadingRef,
  setOuterWrapperRef,
  setInnerWrapperRef,
}) => {
  return (
    <section
      ref={el => setSectionRef(el, index)}
      className="fixed top-0 h-full w-full invisible"
    >
      <div ref={el => setOuterWrapperRef(el, index)} className="w-full h-full overflow-y-hidden">
        <div ref={el => setInnerWrapperRef(el, index)} className="w-full h-full overflow-y-hidden">
          <div
            ref={el => setImageRef(el, index)}
            className="bg flex items-center justify-center absolute h-full w-full top-0 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.1) 100%), url("${section.backgroundImage}")`,
              backgroundPosition: section.backgroundPosition || 'center'
            }}
          >
            <h2
              ref={el => setHeadingRef(el, index)}
              className="section-heading text-[clamp(1rem,8vw,10rem)] font-semibold text-center w-[90vw] max-w-[1200px] normal-case z-20"
            >
              {section.title}
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section;