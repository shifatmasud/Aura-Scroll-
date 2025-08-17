
import React, { useRef, useState } from 'react';
import type { SectionData } from '../types';
import PageIndicator, { type PageIndicatorHandles } from './PageIndicator';
import SectionList from './SectionList';
import { useGsapAnimations } from '../hooks/useGsapAnimations';

interface ScrollingSectionsProps {
  sections: SectionData[];
}

const ScrollingSections: React.FC<ScrollingSectionsProps> = ({ sections }) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const pageIndicatorRef = useRef<PageIndicatorHandles>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Initialize refs for all DOM elements that will be animated
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const outerWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Encapsulate all GSAP logic in a custom hook
  useGsapAnimations({
    mainRef,
    sectionRefs,
    imageRefs,
    headingRefs,
    outerWrapperRefs,
    innerWrapperRefs,
    pageIndicatorRef,
  }, sections, setActiveIndex);

  return (
    <>
      <div ref={mainRef}>
        <SectionList
          sections={sections}
          sectionRefs={sectionRefs}
          imageRefs={imageRefs}
          headingRefs={headingRefs}
          outerWrapperRefs={outerWrapperRefs}
          innerWrapperRefs={innerWrapperRefs}
        />
      </div>
      <PageIndicator ref={pageIndicatorRef} />
    </>
  );
};

export default ScrollingSections;
