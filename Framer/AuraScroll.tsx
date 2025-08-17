// AuraScroll.tsx
import React, { useRef, useState, useLayoutEffect, forwardRef, useImperativeHandle, useEffect } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

//================================================================
// GSAP ASYNCHRONOUS LOADER
//================================================================
let gsap: any, Observer: any, SplitText: any, ScrollToPlugin: any;
const gsapReadyPromise = (async () => {
    // Prevent re-initialization
    if (gsap) return;
    try {
        const [gsapModule, ObserverModule, SplitTextModule, ScrollToModule] = await Promise.all([
            import("gsap"),
            import("gsap/Observer"),
            import("gsap/SplitText"),
            import("gsap/ScrollToPlugin"),
        ]);
        gsap = gsapModule.default;
        Observer = ObserverModule.default;
        SplitText = SplitTextModule.default;
        ScrollToPlugin = ScrollToModule.default;
        gsap.registerPlugin(Observer, SplitText, ScrollToPlugin);
    } catch (e) {
        console.error("Failed to load GSAP modules", e);
    }
})();


//================================================================
// TYPES & INTERFACES
//================================================================
interface SectionData {
    id?: number | string
    title: string
    backgroundImage: string
    backgroundPosition?: string
}

interface PageIndicatorHandles {
    rootRef: React.RefObject<HTMLDivElement>
    tensRef: React.RefObject<HTMLSpanElement>
    unitsRef: React.RefObject<HTMLSpanElement>
}

interface AuraScrollProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    sections: SectionData[]
    transitions: {
        duration: number
        ease: string
        blurAmount: number
        textStagger: number
        infiniteScroll: boolean
    }
    ui: {
        showLogo: boolean
        showIndicator: boolean
        headerHeight: string
        indicatorBottom: string
        logoFont: object
        indicatorFont: object
        headingFont: object
        digitHeight: number
    }
    width: number,
    height: number
}

//================================================================
// ANIMATION HOOK
//================================================================
const useGsapAnimations = (
    mainRef: React.RefObject<HTMLDivElement>,
    sections: SectionData[],
    transitions: AuraScrollProps['transitions'],
    ui: AuraScrollProps['ui'],
    isGsapReady: boolean
) => {
    const sectionRefs = useRef<(HTMLElement | null)[]>([]);
    const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
    const outerWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
    const innerWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
    const pageIndicatorRef = useRef<PageIndicatorHandles>(null);

    // Use refs for all mutable state to prevent stale closures in GSAP callbacks.
    const currentIndexRef = useRef(0);
    const animatingRef = useRef(false);
    const observerRef = useRef<any>(null);
    const splitHeadingsRef = useRef<any[]>([]);
    const isSnappingRef = useRef(false);


    useLayoutEffect(() => {
        if (!isGsapReady || !mainRef.current || RenderTarget.current() === "CANVAS") return;

        const sectionsDom = sectionRefs.current.filter(Boolean) as HTMLElement[];
        if (sectionsDom.length === 0) return;
        
        let intersectionObserver: IntersectionObserver | undefined;

        let ctx = gsap.context(() => {
            splitHeadingsRef.current = headingRefs.current.filter(Boolean).map(h => new SplitText(h, { type: "chars,words,lines", linesClass: "clip-text" }));
            
            const outerWrappersDom = outerWrapperRefs.current.filter(Boolean) as HTMLDivElement[];
            const innerWrappersDom = innerWrapperRefs.current.filter(Boolean) as HTMLDivElement[];
            const imagesDom = imageRefs.current.filter(Boolean) as HTMLDivElement[];
            
            // Initial scene setup
            gsap.set(outerWrappersDom, { yPercent: 100 });
            gsap.set(innerWrappersDom, { yPercent: -100 });
            gsap.set(pageIndicatorRef.current?.rootRef.current, {autoAlpha: 0, y: -30});
            gsap.set(sectionsDom, { autoAlpha: 0 });

            // Setup first section
            currentIndexRef.current = 0;
            animatingRef.current = false;
            gsap.set(sectionsDom[0], { autoAlpha: 1, zIndex: 1 });
            gsap.set([outerWrappersDom[0], innerWrappersDom[0]], { yPercent: 0 });
            gsap.set(imagesDom[0], { yPercent: 0 });
            if (splitHeadingsRef.current[0]?.chars) {
                gsap.set(splitHeadingsRef.current[0].chars, { autoAlpha: 1 });
            }

            const digitHeight = ui.digitHeight;
            gsap.set(pageIndicatorRef.current?.tensRef.current, { y: 0 });
            gsap.set(pageIndicatorRef.current?.unitsRef.current, { y: -1 * digitHeight });
            gsap.to(pageIndicatorRef.current?.rootRef.current, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" });

            const gotoSection = (index: number, direction: number) => {
                let toIndex = index;
                if (transitions.infiniteScroll) {
                    toIndex = gsap.utils.wrap(0, sections.length, index);
                }

                if (currentIndexRef.current === toIndex) return;

                animatingRef.current = true;
                const fromIndex = currentIndexRef.current;
                currentIndexRef.current = toIndex;

                const dFactor = direction === -1 ? -1 : 1;
                
                const tl = gsap.timeline({
                    defaults: { duration: transitions.duration, ease: transitions.ease },
                    onComplete: () => { animatingRef.current = false; }
                });

                gsap.set(sectionsDom[fromIndex], { zIndex: 0 });
                if (splitHeadingsRef.current[fromIndex]?.chars) {
                    tl.to(splitHeadingsRef.current[fromIndex].chars, { autoAlpha: 0, yPercent: -150 * dFactor, duration: 0.8, ease: "power2.in", stagger: { each: transitions.textStagger, from: "random" }}, 0);
                }
                tl.to(imagesDom[fromIndex], { yPercent: -30 * dFactor, filter: `blur(${transitions.blurAmount}px)`}, 0)
                  .set(sectionsDom[fromIndex], { autoAlpha: 0 });

                gsap.set(sectionsDom[toIndex], { autoAlpha: 1, zIndex: 1 });
                tl.fromTo([outerWrappersDom[toIndex], innerWrappersDom[toIndex]], { yPercent: i => i ? -100 * dFactor : 100 * dFactor }, { yPercent: 0 }, 0);
                tl.fromTo(imagesDom[toIndex], { yPercent: 30 * dFactor, filter: `blur(${transitions.blurAmount}px)`}, { yPercent: 0, filter: 'blur(0px)'}, 0);
                if (splitHeadingsRef.current[toIndex]?.chars) {
                  tl.fromTo(splitHeadingsRef.current[toIndex].chars, { autoAlpha: 0, yPercent: 150 * dFactor }, { autoAlpha: 1, yPercent: 0, duration: 1, ease: "power2", stagger: { each: transitions.textStagger, from: "random" }}, 0.2);
                }

                const nextNumber = toIndex + 1;
                tl.to(pageIndicatorRef.current?.tensRef.current, { y: -Math.floor(nextNumber / 10) * digitHeight, duration: 1, ease: "power2" }, 0.2);
                tl.to(pageIndicatorRef.current?.unitsRef.current, { y: -(nextNumber % 10) * digitHeight, duration: 1, ease: "power2" }, 0.2);
            };
            
            observerRef.current = Observer.create({
                target: mainRef.current,
                type: "wheel,touch,pointer",
                wheelSpeed: -1,
                onDown: (self: any) => {
                    if (animatingRef.current) return;
                    const newIndex = currentIndexRef.current - 1;
                    if (!transitions.infiniteScroll && newIndex < 0) {
                        observerRef.current.disable();
                        return;
                    }
                    gotoSection(newIndex, -1);
                },
                onUp: (self: any) => {
                    if (animatingRef.current) return;
                    const newIndex = currentIndexRef.current + 1;
                    if (!transitions.infiniteScroll && newIndex >= sections.length) {
                        observerRef.current.disable();
                        return;
                    }
                    gotoSection(newIndex, 1);
                },
                tolerance: 10,
                preventDefault: true,
            });
            
            observerRef.current.disable();

            if (transitions.infiniteScroll) {
                observerRef.current.enable();
            } else {
                intersectionObserver = new IntersectionObserver(
                    ([entry]) => {
                        const observer = observerRef.current;
                        if (!observer || isSnappingRef.current) return;

                        // When scrolling INTO view and the observer is currently off
                        if (entry.isIntersecting && !observer.isEnabled) {
                            isSnappingRef.current = true;
                            // Snap the browser scroll to the top of the component.
                            gsap.to(window, {
                                scrollTo: mainRef.current!,
                                duration: 0.5,
                                ease: "power2.inOut",
                                onComplete: () => {
                                    observer.enable();
                                    isSnappingRef.current = false;
                                }
                            });
                        } 
                        // When scrolling OUT of view and the observer is currently on
                        else if (!entry.isIntersecting && observer.isEnabled) {
                            observer.disable();
                        }
                    },
                    { 
                        // Trigger when 80% of the component is visible.
                        threshold: 0.8 
                    }
                );
                if(mainRef.current) {
                    intersectionObserver.observe(mainRef.current);
                }
            }
        }, mainRef);

        return () => {
            intersectionObserver?.disconnect();
            observerRef.current?.kill();
            ctx.revert();
        };
    }, [isGsapReady, sections, transitions, ui]);
    
    return {
        sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs, pageIndicatorRef
    };
};

//================================================================
// CHILD & CONTENT COMPONENTS
//================================================================
const Header: React.FC<{ uiConfig: AuraScrollProps["ui"] }> = ({ uiConfig }) => (
    <header style={{ position: "absolute", top: 0, left: "5%", right: "5%", display: "flex", alignItems: "center", zIndex: 30, color: "white", height: uiConfig.headerHeight, ...uiConfig.logoFont }}>
        AS
    </header>
);

const DigitStrip: React.FC<{ digitRef: React.RefObject<any>; uiConfig: AuraScrollProps["ui"] }> = ({ digitRef, uiConfig }) => (
    <span ref={digitRef} style={{ display: "inline-block" }}>
        {[...Array(10)].map((_, i) => (
            <span key={i} style={{ display: "block", height: `${uiConfig.digitHeight}px`, lineHeight: `${uiConfig.digitHeight}px` }}>{i}</span>
        ))}
    </span>
);

const PageIndicator = forwardRef<PageIndicatorHandles, { uiConfig: AuraScrollProps["ui"] }>(({ uiConfig }, ref) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const tensRef = useRef<HTMLSpanElement>(null);
    const unitsRef = useRef<HTMLSpanElement>(null);
    useImperativeHandle(ref, () => ({ rootRef, tensRef, unitsRef }));
    return (
        <div ref={rootRef} style={{ position: "absolute", right: "5%", zIndex: 30, display: "flex", height: `${uiConfig.digitHeight}px`, bottom: uiConfig.indicatorBottom, ...uiConfig.indicatorFont }}>
            <span style={{ overflow: "hidden", height: `${uiConfig.digitHeight}px` }}><DigitStrip digitRef={tensRef} uiConfig={uiConfig} /></span>
            <span style={{ overflow: "hidden", height: `${uiConfig.digitHeight}px` }}><DigitStrip digitRef={unitsRef} uiConfig={uiConfig} /></span>
        </div>
    );
});

const Section: React.FC<{
    section: SectionData; index: number; uiConfig: AuraScrollProps["ui"];
    refs: { setSectionRef: (el: any, i: number) => void; setImageRef: (el: any, i: number) => void; setHeadingRef: (el: any, i: number) => void; setOuterWrapperRef: (el: any, i: number) => void; setInnerWrapperRef: (el: any, i: number) => void; }
}> = ({ section, index, uiConfig, refs }) => (
    <section ref={el => refs.setSectionRef(el, index)} style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "100%", visibility: "hidden" }}>
        <div ref={el => refs.setOuterWrapperRef(el, index)} style={{ width: "100%", height: "100%", overflowY: "hidden" }}>
            <div ref={el => refs.setInnerWrapperRef(el, index)} style={{ width: "100%", height: "100%", overflowY: "hidden" }}>
                <div ref={el => refs.setImageRef(el, index)} style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "absolute", height: "100%", width: "100%", top: 0, backgroundSize: "cover", backgroundPosition: section.backgroundPosition || 'center', backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.1) 100%), url("${section.backgroundImage}")`}}>
                    <h2 ref={el => refs.setHeadingRef(el, index)} style={{ textAlign: "center", width: "90vw", maxWidth: "1200px", zIndex: 20, color: "white", ...uiConfig.headingFont }}>
                        {section.title}
                    </h2>
                </div>
            </div>
        </div>
    </section>
);


const StaticCanvasPreview: React.FC<AuraScrollProps> = ({ sections, ui, width, height, style, ...rest }) => (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", ...style }} {...rest}>
        <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "black", color: "white", textTransform: "uppercase", width: "100%", height: "100%" }}>
            {ui.showLogo && <Header uiConfig={ui} />}
            {sections.length > 0 && 
                <section style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "100%", visibility: "visible" }}>
                     <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "absolute", height: "100%", width: "100%", top: 0, backgroundSize: "cover", backgroundPosition: sections[0].backgroundPosition || 'center', backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.1) 100%), url("${sections[0].backgroundImage}")`}}>
                        <h2 style={{ textAlign: "center", width: "90vw", maxWidth: "1200px", zIndex: 20, color: "white", ...ui.headingFont }}>
                            {sections[0].title}
                        </h2>
                    </div>
                </section>
            }
            {ui.showIndicator && 
                 <div style={{ position: "absolute", right: "5%", zIndex: 30, display: "flex", height: `${ui.digitHeight}px`, bottom: ui.indicatorBottom, ...ui.indicatorFont }}>
                    <span style={{ overflow: "hidden", height: `${ui.digitHeight}px` }}><span>0</span></span>
                    <span style={{ overflow: "hidden", height: `${ui.digitHeight}px` }}><span>1</span></span>
                </div>
            }
        </div>
    </div>
);


//================================================================
// MAIN COMPONENT & FRAMER EXPORT
//================================================================
/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 */
export default function AuraScroll(props: AuraScrollProps) {
    const { sections, transitions, ui, width, height, style, ...rest } = props;
    const [isGsapReady, setIsGsapReady] = useState(false);
    const isCanvas = RenderTarget.current() === "CANVAS";

    useEffect(() => {
        if (!isCanvas) {
            gsapReadyPromise.then(() => setIsGsapReady(true));
        }
    }, [isCanvas]);
    
    const mainRef = useRef<HTMLDivElement>(null);
    const { sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs, pageIndicatorRef } = useGsapAnimations(mainRef, sections, transitions, ui, isGsapReady);

    if (isCanvas) {
        return <StaticCanvasPreview {...props} />;
    }

    if (!isGsapReady) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width, height, color: 'white', backgroundColor: 'black', fontFamily: 'sans-serif' }}>
                Initializing...
            </div>
        );
    }
    
    return (
        <div ref={mainRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", ...style }} {...rest}>
            <style>{`
                .clip-text { overflow: hidden; }
                div, h2, span { will-change: transform; }
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Syne:wght@600&display=swap');
            `}</style>
            
            <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "black", color: "white", textTransform: "uppercase", width: "100%", height: "100%" }}>
                {ui.showLogo && <Header uiConfig={ui} />}
                {sections.map((section, index) => (
                    <Section
                        key={section.id || index}
                        section={section}
                        index={index}
                        uiConfig={ui}
                        refs={{
                            setSectionRef: (el, i) => sectionRefs.current[i] = el,
                            setImageRef: (el, i) => imageRefs.current[i] = el,
                            setHeadingRef: (el, i) => headingRefs.current[i] = el,
                            setOuterWrapperRef: (el, i) => outerWrapperRefs.current[i] = el,
                            setInnerWrapperRef: (el, i) => innerWrapperRefs.current[i] = el,
                        }}
                    />
                ))}
                {ui.showIndicator && <PageIndicator ref={pageIndicatorRef} uiConfig={ui} />}
            </div>
        </div>
    );
}

AuraScroll.displayName = "AuraScroll"

addPropertyControls(AuraScroll, {
    sections: {
        type: ControlType.Array,
        title: "Sections",
        control: {
            type: ControlType.Object,
            controls: {
                title: { type: ControlType.String, defaultValue: "New Section" },
                backgroundImage: { type: ControlType.Image },
                backgroundPosition: { type: ControlType.String, defaultValue: "center" },
            },
        },
    },
    transitions: {
        type: ControlType.Object,
        title: "Transitions",
        controls: {
            duration: { type: ControlType.Number, title: "Duration", defaultValue: 1.25, min: 0.1, max: 5, step: 0.05, description: "The duration of the animation between sections." },
            ease: { type: ControlType.Enum, title: "Ease", options: ["power1.inOut", "power2.inOut", "power3.inOut", "expo.inOut", "circ.inOut", "back.inOut"], optionTitles: ["Power1", "Power2", "Power3", "Expo", "Circ", "Back"], defaultValue: "power1.inOut" },
            blurAmount: { type: ControlType.Number, title: "Blur (px)", defaultValue: 5, min: 0, max: 50, step: 1 },
            textStagger: { type: ControlType.Number, title: "Text Stagger", defaultValue: 0.02, min: 0, max: 0.1, step: 0.005 },
            infiniteScroll: { type: ControlType.Boolean, title: "Infinite Scroll", defaultValue: true, description: "ON: Full-page takeover. OFF: Scrolls through sections once, then allows native page scroll." },
        },
    },
    ui: {
        type: ControlType.Object,
        title: "UI & Layout",
        controls: {
            showLogo: { type: ControlType.Boolean, title: "Show Logo", defaultValue: true },
            showIndicator: { type: ControlType.Boolean, title: "Show Indicator", defaultValue: true },
            headerHeight: { type: ControlType.String, title: "Header Height", defaultValue: "7em", placeholder: "e.g., 7em or 100px" },
            indicatorBottom: { type: ControlType.String, title: "Indicator Bottom", defaultValue: "7em", placeholder: "e.g., 7em or 100px" },
            logoFont: { type: ControlType.Font, title: "Logo Font", controls: "extended" },
            indicatorFont: { type: ControlType.Font, title: "Indicator Font", controls: "extended" },
            headingFont: { type: ControlType.Font, title: "Heading Font", controls: "extended" },
            digitHeight: { type: ControlType.Number, title: "Digit Height (px)", defaultValue: 20, min: 10, max: 50, step: 1 },
        },
    },
});

AuraScroll.defaultProps = {
    width: 800,
    height: 600,
    sections: [
        { id: 1, title: 'Aura Scape', backgroundImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto.format&fit=crop" },
        { id: 2, title: 'Serene Waters', backgroundImage: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto.format&fit=crop" },
        { id: 3, title: 'Mountain Pass', backgroundImage: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto.format&fit=crop" },
    ],
    transitions: {
        duration: 1.25,
        ease: "power1.inOut",
        blurAmount: 5,
        textStagger: 0.02,
        infiniteScroll: true,
    },
    ui: {
        showLogo: true,
        showIndicator: true,
        headerHeight: "7em",
        indicatorBottom: "7em",
        logoFont: { fontFamily: "'Inter', sans-serif", fontWeight: "600", fontSize: "1rem", letterSpacing: "0.5em" },
        indicatorFont: { fontFamily: "'Inter', sans-serif", fontSize: "1rem", letterSpacing: "0.2em" },
        headingFont: { fontFamily: "'Syne', sans-serif", fontWeight: "600", fontSize: "clamp(1rem, 8vw, 8rem)", textTransform: "none" },
        digitHeight: 20,
    },
};