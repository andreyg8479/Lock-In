import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { sortNotes, type SortOption } from "./noteListSort";
import { getAllNoteNames as loadNotes } from "./api";
import { getAllNotesClient } from "./client_storage";
import { decryptFilenames, verifySecondPassword } from "./crypto/lockinCrypto";
import type { DisplayNote, NoteType } from "../../shared_types/note_types";
import './NoteList.css'
import { useKeyComboDetector } from './useKeyComboDetector'
import { getAlt, getCtrl, getKey, getShift } from './SettingsMem'

type DateFilterField = 'created' | 'updated'

function localDateYYYYMMDD(): string {
	const d = new Date()
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err)
}

function isCompleteDateYYYYMMDD(s: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function dateRangeValidationMessage(from: string, to: string): string | null {
	const today = localDateYYYYMMDD()
	if (from && isCompleteDateYYYYMMDD(from) && from > today) {
		return 'Date range cannot include a future date.'
	}
	if (to && isCompleteDateYYYYMMDD(to) && to > today) {
		return 'Date range cannot include a future date.'
	}
	if (isCompleteDateYYYYMMDD(from) && isCompleteDateYYYYMMDD(to) && from > to) {
		return 'The "from" date must be on or before the "to" date.'
	}
	return null
}

function notePassesDateRange(
	note: DisplayNote,
	field: DateFilterField,
	dateFrom: string,
	dateTo: string
): boolean {
	if (!dateFrom && !dateTo) return true
	const t = new Date(field === 'created' ? note.created_at : note.updated_at).getTime()
	if (Number.isNaN(t)) return false
	const fromMs = dateFrom
		? new Date(`${dateFrom}T00:00:00`).getTime()
		: null
	const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null
	if (fromMs !== null && t < fromMs) return false
	if (toMs !== null && t > toMs) return false
	return true
}

/** Set to false when login works again — shows demo server + client rows without auth. */
const FAKE_NOTE_LIST_PREVIEW = false

function fakeDemoNotes(): DisplayNote[] {
	const now = Date.now()
	const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString()
	return [
		{
			user_id: "preview-user",
			id: "fake-preview-server-1",
			note_title: "Weekly standup",
			note_text: "",
			iv_b64: "",
			pinned: true,
			note_type: "text",
			updated_at: iso(-86_400_000),
			created_at: iso(-1_209_600_000),
			second_password: null,
			client: false,
		},
		{
			user_id: "preview-user",
			id: "fake-preview-server-2",
			note_title: "Bookmarks",
			note_text: "",
			iv_b64: "",
			pinned: false,
			note_type: "text",
			updated_at: iso(-3_600_000),
			created_at: iso(-604_800_000),
			second_password: null,
			client: false,
		},
		{
			user_id: "preview-user",
			id: "fake-preview-client-1",
			note_title: "Scratch pad",
			note_text: "",
			iv_b64: "",
			pinned: false,
			note_type: "text",
			updated_at: iso(-120_000),
			created_at: iso(-2_592_000_000),
			second_password: null,
			client: true,
		},
		{
			user_id: "preview-user",
			id: "fake-preview-client-2",
			note_title: "Voice memo (audio)",
			note_text: "",
			iv_b64: "",
			pinned: false,
			note_type: "audio",
			updated_at: iso(-500),
			created_at: iso(-86_400_000),
			second_password: null,
			client: true,
		},
	]
}

function NotePage() {

	const navigate = useNavigate();
	const { userId, vaultKey } = useAuth();
	const [sortBy, setSortBy] = useState<SortOption>('byName');
	const [showTypes, setShowTypes] = useState<NoteType | 'all'>('all');
	const [searchTerm, setSearchTerm] = useState<string>('');
	const [dateFilterField, setDateFilterField] = useState<DateFilterField>('updated');
	const [dateFrom, setDateFrom] = useState<string>('');
	const [dateTo, setDateTo] = useState<string>('');
	const [dateFilterOpen, setDateFilterOpen] = useState(false);
	const dateFilterWrapRef = useRef<HTMLDivElement>(null);
	const todayMax = localDateYYYYMMDD();
	/** Shown in-page below the header when loading the note list fails (not the browser alert dialog). */
	const [listLoadError, setListLoadError] = useState<string | null>(null);
	const [dateFilterError, setDateFilterError] = useState<string | null>(null);
	
	const [isListHidden, setIsListHidden] = useState<boolean>(false);
	const notesCacheRef = useRef<DisplayNote[]>([]);
	const hideButtonRef = useRef<HTMLButtonElement | null>(null);
	const hideCombo = {
		key: getKey(),
		shift: getShift(),
		alt: getAlt(),
		ctrl: getCtrl(),
	} as const;
	
	const searchTermRef = useRef(searchTerm);
	const sortByRef = useRef(sortBy);

	useEffect(() => {
		searchTermRef.current = searchTerm;
	}, [searchTerm]);

	useEffect(() => {
		sortByRef.current = sortBy;
	}, [sortBy]);

	useEffect(() => {
		displayNotes(notesCacheRef.current);
	}, [searchTerm, sortBy, dateFilterField, dateFrom, dateTo, showTypes, isListHidden]);

	useKeyComboDetector(hideCombo, () => {
		hideButtonRef.current?.click();
	}, { preventDefault: true });

	useEffect(() => {
		if (!dateFilterOpen) return;
		const onDocMouseDown = (e: MouseEvent) => {
			const el = dateFilterWrapRef.current;
			if (!el || el.contains(e.target as Node)) return;
			setDateFilterOpen(false);
		};
		document.addEventListener("mousedown", onDocMouseDown);
		return () => document.removeEventListener("mousedown", onDocMouseDown);
	}, [dateFilterOpen]);

	useEffect(() => {
		if (!dateFilterOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setDateFilterOpen(false);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [dateFilterOpen]);

	useEffect(() => {
		if (!dateFilterOpen) setDateFilterError(null);
	}, [dateFilterOpen]);

	useEffect(() => {
		loadList();
	}, [])


	useEffect(() => {

		// interval to load list every 10 seconds when the page is visible

		let interval: ReturnType<typeof setInterval> | null = null;


		const startInterval = () => {
			interval = setInterval(() => {
				loadList({ silent: true });
			}, 10000);
		};

		const stopInterval = () => {
			if (interval !== null) {
				clearInterval(interval);
				interval = null;
			}
		};


		if (document.visibilityState === "visible") {
			startInterval();
		}

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				startInterval();
			} else {
				stopInterval();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			stopInterval();
		};

	}, []);

	// Refresh list when sorting mode changes
	useEffect(() => {
		loadList();
	}, [sortBy]);


	async function loadList(options?: { silent?: boolean }) {
		const silent = options?.silent === true
		const loadErrors: string[] = []
		if (FAKE_NOTE_LIST_PREVIEW) {
			const notes = fakeDemoNotes()
			notesCacheRef.current = notes
			displayNotes(notes)
			if (!silent) setListLoadError(null)
			return
		}

		let allNotes: DisplayNote[] = [];

		if (!userId || !vaultKey) {
			notesCacheRef.current = []
			displayNotes([]);
			if (!silent) setListLoadError(null)
			return;
		}

		// 1. Get list from server
		if (userId) {
			try {
				const response = await loadNotes({ userID: userId });
				
				if (response.notes) {
					const serverNotes = response.notes.map((n: any) : DisplayNote => ({
						user_id: n.user_id,
						id: n.id,
						note_title: n.note_title,
						note_text: "",
						iv_b64: n.iv_b64 || "",
						pinned: n.pinned,
						note_type: n.note_type || 'text',
						updated_at: n.updated_at,
						created_at: n.created_at,
						second_password: n.second_password ?? null,
						client: false
					}));
					allNotes = [...allNotes, ...serverNotes];
				}
			} catch (err) {
				console.error("Failed to load server notes:", err);
				loadErrors.push(`Could not load notes from the server.\n${errorMessage(err)}`);
			}
		}

		// 2. Get list from client storage
		try {
			const clientNotesRaw = await getAllNotesClient();
			const filteredClientNotes = clientNotesRaw.filter(n => n.user_id === userId);

			const clientNotes = filteredClientNotes.map((n) : DisplayNote => ({
				user_id: n.user_id,
				id: n.id,
				note_title: n.note_title,
				note_text: "",
				iv_b64: n.iv_b64 || "",
				pinned: n.pinned,
				note_type: n.note_type || 'text',
				updated_at: n.updated_at,
				created_at: n.created_at,
				second_password: n.second_password ?? null,
				client: true
			}));
			allNotes = [...allNotes, ...clientNotes];

		} catch (e) {
			console.error("Failed to load client notes:", e);
			loadErrors.push(`Could not load notes stored on this device.\n${errorMessage(e)}`);
		}

		// 3. Decrypt names if key is available
		if (vaultKey && allNotes.length > 0) {
			try {
				const encryptedNames = allNotes.map(n => n.note_title);
				const decryptedNames = await decryptFilenames(encryptedNames, vaultKey);
				
				allNotes = allNotes.map((note, index) => ({
					...note,
					note_title: decryptedNames[index]
				}));
			} catch (e) {
				console.error("Decryption error:", e);
				loadErrors.push(
					`Could not decrypt note names.\n${errorMessage(e)}\nIf you changed your password, try logging in again.`,
				);
			}
		}

		notesCacheRef.current = allNotes
		displayNotes(allNotes);

		if (!silent) {
			setListLoadError(loadErrors.length > 0 ? loadErrors.join("\n\n") : null);
		}
	}

	function displayNotes(notes: DisplayNote[], term = searchTerm, sort = sortBy) {
	
		const filtered = notes
			.filter(note =>
				note.note_title.toLowerCase().includes(term.toLowerCase())
			)
			.filter((note) => {
				if (dateRangeValidationMessage(dateFrom, dateTo) !== null) return true
				return notePassesDateRange(note, dateFilterField, dateFrom, dateTo)
			})
	
		const sorted = sortNotes(filtered, sort);
		
		renderNoteList(sorted);
	}

	function renderNoteList(notes: DisplayNote[]) {
		const listBox = document.getElementById("noteList");
		if (!listBox) return;

		if (isListHidden) return;

		listBox.innerHTML = "";

		const visible = notes.filter(
			(n) => showTypes === "all" || n.note_type === showTypes,
		);
		const totalInVault = notesCacheRef.current.length;

		if (visible.length === 0) {
			listBox.removeAttribute("role");
			const empty = document.createElement("div");
			empty.className = "note-list-empty";
			const title = document.createElement("p");
			title.className = "note-list-empty-title";
			const hint = document.createElement("p");
			hint.className = "note-list-empty-hint";
			if (totalInVault === 0) {
				title.textContent = "No notes in your vault yet";
				hint.textContent = "When you add notes on this device or sync from the server, they will show up here.";
			} else if (notes.length === 0) {
				title.textContent = "No matches for your search or date filters";
				hint.textContent = "Clear the search box or date range, or check spelling.";
			} else {
				title.textContent = "No notes of this type";
				hint.textContent = "Try “All types” in the filter, or add a new note in this format.";
			}
			empty.appendChild(title);
			empty.appendChild(hint);
			if (totalInVault === 0) {
				const cta = document.createElement("button");
				cta.type = "button";
				cta.className = "note-list-btn note-list-btn--primary";
				cta.textContent = "New note";
				cta.addEventListener("click", () => navigate("/NoteEdit"));
				empty.appendChild(cta);
			}
			listBox.appendChild(empty);
			return;
		}

		listBox.setAttribute("role", "list");
		listBox.setAttribute("aria-label", "Your notes");

		for (const note of visible) {
			const item = document.createElement("div");
			item.className = "list-item";
			item.setAttribute("role", "listitem");
			if (note.pinned) item.classList.add("list-item--pinned");

			const left = document.createElement("div");
			left.className = "list-item-left";

			const storageBadge = document.createElement("span");
			storageBadge.className = note.client
				? "note-storage-badge note-storage-badge--local"
				: "note-storage-badge note-storage-badge--server";
			storageBadge.textContent = note.client ? "This device" : "Server";
			storageBadge.title = note.client
				? "Saved only on this device"
				: "Synced to your account on the server";
			left.appendChild(storageBadge);

			if (note.pinned) {
				const pin = document.createElement("span");
				pin.className = "list-item-pinned";
				pin.setAttribute("aria-label", "Pinned");
				pin.setAttribute("aria-hidden", "true");
				pin.textContent = "\u{1F4CC}";
				left.appendChild(pin);
			}

			const name = document.createElement("span");
			name.className = "list-item-title";
			name.textContent = note.note_title;
			if (note.pinned) {
				name.title = `Pinned — ${note.note_title}`;
			}
			left.appendChild(name);

			item.appendChild(left);

			const editButton = document.createElement("button");
			editButton.type = "button";
			editButton.className = "edit-button";
			const openIcon = document.createElement("span");
			openIcon.className = "material-symbols-outlined edit-icon";
			openIcon.setAttribute("aria-hidden", "true");
			openIcon.textContent = "edit_note";
			const openLabel = document.createElement("span");
			openLabel.className = "edit-label";
			openLabel.textContent = "Open";
			editButton.appendChild(openIcon);
			editButton.appendChild(openLabel);
			if (FAKE_NOTE_LIST_PREVIEW) {
				editButton.disabled = true;
				editButton.title = "Preview only — log in to open notes";
			} else {
				editButton.setAttribute("aria-label", `Open ${note.note_title}`);
				editButton.addEventListener("click", async () => {
					if (note.second_password) {
						if (!vaultKey) {
							alert("Encryption key not available. Please log in again.");
							return;
						}
						let verified = false;
						while (!verified) {
							const attempt = prompt("This note is locked. Enter the second password:");
							if (attempt === null) return; // user cancelled
							verified = await verifySecondPassword(attempt, note.second_password, vaultKey);
							if (!verified) {
								alert("Incorrect password. Try again.");
							}
						}
					}
					navigate("/NoteEdit", { state: { noteId: note.id, noteName: note.note_title, client: note.client } });
				});
			}

			item.appendChild(editButton);

			listBox.appendChild(item);
		}
	}
	
	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(event.target.value);
	};

	const toggleListVisibility = () => {
		setIsListHidden((prev) => !prev);
	};

  return (
	<div className="note-list-page">
		<header className="note-list-header">
			<div className="note-list-header-main">
				<Link to="/" className="note-list-back" title="Back to home" aria-label="Back to home">
					<span className="material-symbols-outlined" aria-hidden>arrow_back</span>
				</Link>
				<div className="note-list-title-block">
					<h1>Your notes</h1>
					<p className="note-list-subtitle">Search, filter, and open your encrypted notes.</p>
				</div>
			</div>
			<div className="note-list-header-actions">
				<button type="button" className="note-list-btn note-list-btn--ghost" onClick={() => loadList()}>
					Refresh
				</button>
				<button type="button" className="note-list-btn note-list-btn--primary" onClick={() => navigate("/NoteEdit")}>
					New note
				</button>
			</div>
		</header>

		{listLoadError ? (
			<div
				className="notes-page-banner notes-page-banner-error"
				role="alert"
				aria-live="polite"
			>
				<p className="notes-page-banner-text">{listLoadError}</p>
				<button
					type="button"
					className="notes-page-banner-dismiss"
					onClick={() => setListLoadError(null)}
				>
					Dismiss
				</button>
			</div>
		) : null}

		<div className="note-list-toolbar">
			<div className="note-list-search-row">
				<input
					className="note-list-search"
					type="text"
					placeholder="Search by title…"
					value={searchTerm}
					onChange={handleInputChange}
					aria-label="Search notes by title"
				/>
				<button
					type="button"
					className="note-list-btn note-list-btn--ghost"
					ref={hideButtonRef}
					onClick={toggleListVisibility}
				>
					{isListHidden ? "Unhide list" : "Hide list"}
				</button>
			</div>
			<div className="note-list-filters">
				<div className="note-list-labeled-select">
					<span className="date-filter-sublabel">Sort</span>
					<select
						value={sortBy}
						aria-label="Sort notes by"
						onChange={(e) => setSortBy(e.target.value as SortOption)}
					>
						<option value="byName">Name</option>
						<option value="byModified">Last modified</option>
						<option value="byCreated">Date created</option>
					</select>
				</div>
				<div className="note-list-labeled-select">
					<span className="date-filter-sublabel">Type</span>
					<select
						value={showTypes}
						aria-label="Filter by note type"
						onChange={(e) => setShowTypes(e.target.value as NoteType | "all")}
					>
						<option value="all">All types</option>
						<option value="text">Text</option>
						<option value="audio">Audio</option>
						<option value="image">Image</option>
						<option value="video">Video</option>
					</select>
				</div>
				<div className="date-filter-wrap" ref={dateFilterWrapRef}>
					<button
						type="button"
						className={`date-filter-trigger${dateFrom || dateTo ? " date-filter-trigger-active" : ""}`}
						onClick={() => setDateFilterOpen((o) => !o)}
						aria-expanded={dateFilterOpen}
						aria-haspopup="dialog"
					>
						Date range
						{dateFrom || dateTo ? (
							<span className="date-filter-active-indicator" aria-hidden="true" />
						) : null}
					</button>
					{dateFilterOpen ? (
						<div className="date-filter-popover" role="dialog" aria-label="Filter notes by date">
							<div className="date-filter-popover-inner">
								<label className="date-filter-field-label">
									<span className="date-filter-label-text">Filter by</span>
									<select
										value={dateFilterField}
										onChange={(e) => setDateFilterField(e.target.value as DateFilterField)}
										aria-label="Filter dates by"
									>
										<option value="updated">Updated</option>
										<option value="created">Created</option>
									</select>
								</label>
								<div className="date-filter-dates-row">
									<label className="date-filter-date-label">
										<span className="date-filter-sublabel">From</span>
										<input
											type="date"
											value={dateFrom}
											max={todayMax}
											onChange={(e) => {
												const next = e.target.value;
												setDateFrom(next);
												setDateFilterError(dateRangeValidationMessage(next, dateTo));
											}}
											aria-label="Date from"
											aria-invalid={dateFilterError ? true : undefined}
										/>
									</label>
									<span className="date-filter-to" aria-hidden="true">
										–
									</span>
									<label className="date-filter-date-label">
										<span className="date-filter-sublabel">To</span>
										<input
											type="date"
											value={dateTo}
											max={todayMax}
											onChange={(e) => {
												const next = e.target.value;
												setDateTo(next);
												setDateFilterError(dateRangeValidationMessage(dateFrom, next));
											}}
											aria-label="Date to"
											aria-invalid={dateFilterError ? true : undefined}
										/>
									</label>
								</div>
								{dateFilterError ? (
									<p className="date-filter-inline-error" role="alert">
										{dateFilterError}
									</p>
								) : null}
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
		<div className="list-container">
			<div className={`list-box ${isListHidden ? "list-box-hidden" : ""}`} id="noteList" />
		</div>
	</div>
  )
}

export default NotePage;

