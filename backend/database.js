/**
 * Database routines for notes. Assumes a Supabase "notes" table with at least:
 * id (uuid), user_id (uuid, references users)
 * and optionally: name, content, pinned, created_at, updated_at
 */

/**
 * Delete a note by id. Optionally restrict by user_id for security.
 * @param {import('@supabase/supabase-js').SupabaseClient} client - Supabase client
 * @param {Object} options
 * @param {string} [options.noteId] - Note uuid (use this or noteName + userId)
 * @param {string} [options.userId] - User uuid; if provided with noteId, only deletes when note belongs to user
 * @param {string} [options.noteName] - Note name; use with userId to delete by name
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function deleteNote(client, options = {}) {
  const { noteId, userId, noteName } = options;

  if (noteId) {
    let query = client.from('notes').delete().eq('id', noteId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  if (userId && noteName) {
    const { error } = await client
      .from('notes')
      .delete()
      .eq('user_id', userId)
      .eq('name', noteName);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  return { ok: false, error: 'Provide noteId or both userId and noteName' };
}

/**
 * Delete a user from the users table by id (or by username).
 * @param {import('@supabase/supabase-js').SupabaseClient} client - Supabase client
 * @param {Object} options
 * @param {string} [options.userId] - User uuid
 * @param {string} [options.username] - Username; use to delete by username instead of id
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function deleteUser(client, options = {}) {
  const { userId, username } = options;

  if (userId) {
    const { error } = await client.from('users').delete().eq('id', userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  if (username) {
    const { error } = await client.from('users').delete().eq('username', username);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  return { ok: false, error: 'Provide userId or username' };
}

module.exports = { deleteNote, deleteUser };
