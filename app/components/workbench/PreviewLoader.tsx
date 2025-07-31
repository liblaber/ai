'use client';

type Props = {
  message?: string;
};

export const PreviewLoader = ({ message = 'Your app is loading...' }: Props) => {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="bg-gradient-to-r from-gray-600 from-30% via-gray-100 via-50% to-gray-600 to-70% bg-clip-text text-transparent animate-gradient">
        <div className="text-8xl font-medium mb-8 text-center">{'{ }'}</div>

        <div className="text-xl font-medium text-center">{message}</div>
      </div>

      <style jsx>{`
        .animate-gradient {
          background-size: 200%;
          -webkit-animation: animatedgradient 1s linear infinite;
          -moz-animation: animatedgradient 1s linear infinite;
          animation: animatedgradient 1s linear infinite;
        }

        @keyframes animatedgradient {
          100% {
            background-position: -100% 0%;
          }
          0% {
            background-position: 100% 0%;
          }
        }
      `}</style>
    </div>
  );
};
