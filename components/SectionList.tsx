import React from 'react';
import type { SectionData } from '../types';
import Section from './Section';

interface SectionListProps {
  sections: SectionData[];
  sectionRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  imageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  headingRefs: React.MutableRefObject<(HTMLHeadingElement | null)[]>;
  outerWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  innerWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

const SectionList: React.FC<SectionListProps> = ({
  sections,
  sectionRefs,
  imageRefs,
  headingRefs,
  outerWrapperRefs,
  innerWrapperRefs,
}) => {
  return (
    <>
      {sections.map((section, index) => (
        <Section
          key={section.id}
          section={section}
          index={index}
          setSectionRef={(el, i) => sectionRefs.current[i] = el}
          setImageRef={(el, i) => imageRefs.current[i] = el}
          setHeadingRef={(el, i) => headingRefs.current[i] = el}
          setOuterWrapperRef={(el, i) => outerWrapperRefs.current[i] = el}
          setInnerWrapperRef={(el, i) => innerWrapperRefs.current[i] = el}
        />
      ))}
    </>
  );
};

export default SectionList;