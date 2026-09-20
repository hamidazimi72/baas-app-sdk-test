export type PureFormProps = {
	children?: React.ReactNode;
	boxProps?: React.ComponentProps<'form'>;
};

export const PureForm: React.FC<PureFormProps> = ({
	children,
	// box Control
	boxProps,
}) => {
	return (
		<form {...boxProps} onSubmit={boxProps?.onSubmit ? boxProps.onSubmit : (e) => e.preventDefault()}>
			{children}
		</form>
	);
};
