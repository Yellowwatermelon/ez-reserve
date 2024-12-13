declare module 'react-lottie-player' {
  import { FC } from 'react';

  interface LottieProps {
    animationData: any;
    play?: boolean;
    loop?: boolean;
    style?: React.CSSProperties;
  }

  const Lottie: FC<LottieProps>;
  export default Lottie;
} 