import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from "react-router-dom";
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
		loadList();
	}, [])


	useEffect(() => {

		// interval to load list every 10 seconds when the page is visible

		let interval: ReturnType<typeof setInterval> | null = null;


		const startInterval = () => {
			interval = setInterval(() => {
				loadList();
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


	async function loadList() {
		if (FAKE_NOTE_LIST_PREVIEW) {
			const notes = fakeDemoNotes()
			notesCacheRef.current = notes
			displayNotes(notes)
			return
		}

		let allNotes: DisplayNote[] = [];

		if (!userId || !vaultKey) {
			notesCacheRef.current = []
			displayNotes([]);
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
			}
		}

		notesCacheRef.current = allNotes
		displayNotes(allNotes);
	}

	function displayNotes(notes: DisplayNote[], term = searchTerm, sort = sortBy) {
	
		const filtered = notes
			.filter(note =>
				note.note_title.toLowerCase().includes(term.toLowerCase())
			)
			.filter(note =>
				notePassesDateRange(note, dateFilterField, dateFrom, dateTo)
			)
	
		const sorted = sortNotes(filtered, sort);
		
		renderNoteList(sorted);
	}

	function renderNoteList(notes: DisplayNote[]) {
	  
		const listBox = document.getElementById("noteList");
		if (!listBox) return;
		
		// If the list is currently hidden, do not update its contents
		if (isListHidden) return;
		
		listBox.innerHTML = "";
		
		for (const note of notes) {
		
			if (showTypes !== 'all') {
				if (note.note_type !== showTypes) {
					continue;
				}
			}
		
			const item = document.createElement("div");
			item.className = "list-item";

			const left = document.createElement("div");
			left.className = "list-item-left";

			const storageIcon = document.createElement("span");
			storageIcon.className = "note-storage-icon";
			storageIcon.textContent = note.client ? "💾" : "☁️";
			storageIcon.title = note.client
				? "Saved on this device (client)"
				: "Saved on server";
			storageIcon.setAttribute("aria-label", storageIcon.title);
			left.appendChild(storageIcon);

			const name = document.createElement("span");
			name.className = "list-item-title";
			name.textContent = note.pinned ? "📌 " + note.note_title : note.note_title;
			left.appendChild(name);

			item.appendChild(left);
			
			const editButton = document.createElement("button");
			editButton.textContent = "🖉";
			editButton.className = "edit-button";
			if (FAKE_NOTE_LIST_PREVIEW) {
				editButton.disabled = true;
				editButton.title = "Preview only — login to open notes";
			} else {
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
	
	function homeButton() {
		navigate("/main");
	}
	
	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(event.target.value);
	};

	const toggleListVisibility = () => {
		setIsListHidden((prev) => !prev);
	};

  return (
	<div className="list-page">
	
		<div className="top-bar">
			<button className="home-button" onClick={homeButton}>Home</button>
			<h1>Your Notes</h1>
			<button className="refresh-button" onClick={loadList} >Refresh</button>
			<button className="add-button" onClick={() => navigate("/NoteEdit")}>+ New</button>
		</div>
	
	
		<div className="controls">
			<input 
				type="text" 
				placeholder="Search..."
			    value={searchTerm}
				onChange={handleInputChange}
			/>
			<button
				type="button"
				className="hide-list-button"
				ref={hideButtonRef}
				onClick={toggleListVisibility}
			>
				{isListHidden ? "Unhide Notes" : "Hide Notes"}
			</button>
			<select
				value={sortBy}
				onChange={(e) => setSortBy(e.target.value as SortOption)}
			>
				<option value="byName">By Name</option>
				<option value="byModified">By Modified</option>
				<option value="byCreated">By Created</option>
			</select>
			
			
			<select
				value={showTypes}
				onChange={(e) => setShowTypes(e.target.value as NoteType | 'all')}
			>
				<option value="all">All Types</option>
				<option value="text">Text Only</option>
				<option value="audio">Audio Only</option>
				<option value="image">Image Only</option>
			</select>
			<div className="date-filter-wrap" ref={dateFilterWrapRef}>
				<button
					type="button"
					className={`date-filter-trigger${dateFrom || dateTo ? " date-filter-trigger-active" : ""}`}
					onClick={() => setDateFilterOpen((o) => !o)}
					aria-expanded={dateFilterOpen}
					aria-haspopup="dialog"
				>
					Date range
					{(dateFrom || dateTo) ? (
						<span className="date-filter-active-indicator" aria-hidden="true" />
					) : null}
				</button>
				{dateFilterOpen ? (
					<div
						className="date-filter-popover"
						role="dialog"
						aria-label="Filter notes by date"
					>
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
										onChange={(e) => setDateFrom(e.target.value)}
										aria-label="Date from"
									/>
								</label>
								<span className="date-filter-to" aria-hidden="true">–</span>
								<label className="date-filter-date-label">
									<span className="date-filter-sublabel">To</span>
									<input
										type="date"
										value={dateTo}
										onChange={(e) => setDateTo(e.target.value)}
										aria-label="Date to"
									/>
								</label>
							</div>
						</div>
					</div>
				) : null}
			</div>
		</div>
		<div className="list-container">
			<div
				className={`list-box ${isListHidden ? "list-box-hidden" : ""}`}
				id="noteList"
			>
			</div>
		</div>
		
	</div>
  )
}

export default NotePage;

