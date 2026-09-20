import { useState, useEffect } from 'react';

export const useTimer = (sec?: number, autoStart?: boolean, onEnd?: () => any) => {
	const [seconds, setSeconds] = useState<number>(sec || 0);

	const [stop, setStop] = useState<boolean>(!(autoStart || false));

	useEffect(() => {
		const myInterval = setInterval(() => {
			if (stop) return;
			if (seconds > 0) {
				setSeconds(seconds - 1);
			}
			if (!seconds || seconds === 0) {
				setStop(true);
				if (onEnd) onEnd();
			}
		}, 1000);
		return () => {
			clearInterval(myInterval);
		};
	});

	const resetTimer = (time = sec, autoStart?: boolean) => {
		setSeconds(time || 0);
		setStop(!(autoStart || false));
	};

	return { timer: seconds, setStopTimer: setStop, resetTimer };
};
