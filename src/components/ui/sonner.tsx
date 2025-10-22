import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			theme="dark"
			position="top-right"
			richColors
			expand={true}
			className="toaster group"
			{...props}
		/>
	);
};

export { Toaster };
