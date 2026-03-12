
//for settings

export function getTheme() {
	const theme = localStorage.getItem('theme');
	if (theme) {
		return theme;	
	} else {
		return "light";
	}
}

export function setTheme(theme) {
	localStorage.setItem('theme', theme);
}

export function getPrefSize() {
	const prefSize = localStorage.getItem('prefSize');
	if (prefSize) {
		return parseInt(prefSize);	
	} else {
		return 16;
	}
}

export function setPrefSize(prefSize) {
	localStorage.setItem('prefSize', prefSize.toString());
}

export function getKey() {
	const key = localStorage.getItem('key');
	if (key) {
		return key;	
	} else {
		return "M";
	}
}

export function setKey(key) {
	localStorage.setItem('key', key);
}

export function getShift() {
	const shift = localStorage.getItem('shift');
	if (shift) {
		return shift.toLowerCase() === 'true';	
	} else {
		return false;
	}
}

export function setShift(shift) {
	localStorage.setItem('shift', shift.toString());
}

export function getAlt() {
	const alt = localStorage.getItem('alt');
	if (alt) {
		return alt.toLowerCase() === 'true';	
	} else {
		return true;
	}
}

export function setAlt(alt) {
	localStorage.setItem('alt', alt.toString());
}

//