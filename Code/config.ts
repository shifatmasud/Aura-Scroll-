
export interface SectionData {
  id: number;
  title: string;
  className: string;
  backgroundImage: string;
  backgroundPosition?: string;
}

export const config = {
  sections: [
    {
      id: 1,
      title: 'Aura Scape',
      className: 'first',
      backgroundImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: 2,
      title: 'Serene Waters',
      className: 'second',
      backgroundImage: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: 3,
      title: 'Mountain Pass',
      className: 'third',
      backgroundImage: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: 4,
      title: 'Cascading Falls',
      className: 'fourth',
      backgroundImage: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=1974&auto=format&fit=crop",
    },
    {
      id: 5,
      title: 'Verdant Hills',
      className: 'fifth',
      backgroundImage: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop",
      backgroundPosition: '50% 45%',
    },
  ] as SectionData[],

  animation: {
    // Timeline defaults
    defaultDuration: 1.25,
    defaultEase: "power1.inOut",

    // Text animations
    textOutroDuration: 0.8,
    textOutroEase: "power2.in",
    textOutroYPercent: -150,
    textStagger: 0.02,
    textIntroDuration: 1,
    textIntroEase: "power2",
    textIntroYPercent: 150,

    // Image animations
    imageOutroYPercent: -30,
    imageIntroYPercent: 30,
    imageBlurAmount: '5px',

    // Page indicator animations
    indicatorAnimDuration: 1,
    indicatorAnimEase: "power2",
    indicatorIntroDuration: 1,
    indicatorIntroEase: "power2.out",

    // Scrolling observer
    scrollTolerance: 10,
  },

  ui: {
    pageIndicatorDigitHeight: 20,
    headerHeight: '7em',
    pageIndicatorBottom: '7em',
  }
};
