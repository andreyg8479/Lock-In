export function generatePassword() {
	let code = "";
	const len = 16;
	let posChars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~!@#$%^&*?-_+=";

	for (let i = 0; i < len; i++) {
		const rand = Math.floor(Math.random() * (posChars.length - 1 - 0 + 1)) + 0;
		code += posChars[rand];
		posChars = posChars.slice(0, rand) + posChars.slice(rand + 1);
	}

	return code;
}
