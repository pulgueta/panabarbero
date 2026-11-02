import type { UseEmblaCarouselType } from "embla-carousel-react";
import { useEffect, useState } from "react";

type CarouselApi = UseEmblaCarouselType[1];

function useCarouselApi() {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [, setCurrent] = useState(0);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    setCurrent(carouselApi.selectedScrollSnap() + 1);

    const onSelect = () => {
      setCurrent(carouselApi.selectedScrollSnap() + 1);
    };

    carouselApi.on("select", onSelect);

    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  return [carouselApi, setCarouselApi] as const;
}

export { useCarouselApi };
