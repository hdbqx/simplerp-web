interface Env { 
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const charId = url.searchParams.get('char_id');
  const groupId = url.searchParams.get('group_id');

  if (groupId && groupId !== 'undefined' && groupId !== 'null') {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM messages WHERE group_id = ? ORDER BY timestamp ASC"
    ).bind(groupId).all();
    return Response.json(results);
  } 
  
  if (charId && charId !== 'undefined' && charId !== 'null') {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM messages WHERE char_id = ? AND group_id IS NULL ORDER BY timestamp ASC"
    ).bind(charId).all();
    return Response.json(results);
  }

  return Response.json([]);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { meta } = await context.env.DB.prepare(
      "INSERT INTO messages (char_id, group_id, role, content, image, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      body.char_id || null, 
      body.group_id || null, 
      body.role, 
      body.content, 
      body.image || "", 
      body.timestamp
    ).run();

    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    if (!body.id) return new Response("Missing ID", { status: 400 });

    await context.env.DB.prepare(
      "UPDATE messages SET content = ? WHERE id = ?"
    ).bind(body.content, body.id).run();

    return new Response("Updated");
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

async function extractAndDeleteImage(db: D1Database, bucket: R2Bucket, messageId: string) {
  const { results } = await db.prepare("SELECT image FROM messages WHERE id = ?").bind(messageId).all();
  if (results.length > 0) {
    const imageUrl = (results[0] as any).image;
    if (imageUrl && imageUrl.includes('/api/images?key=')) {
      const match = imageUrl.match(/key=([^&]+)/);
      if (match) {
        const r2Key = decodeURIComponent(match[1]);
        try {
          await bucket.delete(r2Key);
          await db.prepare("DELETE FROM images WHERE r2_key = ?").bind(r2Key).run();
        } catch (e) {
          console.error("Failed to delete image from R2:", e);
        }
      }
    }
  }
}

async function deleteImagesForChar(db: D1Database, bucket: R2Bucket, charId: string) {
  const { results } = await db.prepare("SELECT image FROM messages WHERE char_id = ? AND group_id IS NULL").bind(charId).all();
  for (const row of results as any[]) {
    if (row.image && row.image.includes('/api/images?key=')) {
      const match = row.image.match(/key=([^&]+)/);
      if (match) {
        const r2Key = decodeURIComponent(match[1]);
        try {
          await bucket.delete(r2Key);
          await db.prepare("DELETE FROM images WHERE r2_key = ?").bind(r2Key).run();
        } catch (e) {
          console.error("Failed to delete image from R2:", e);
        }
      }
    }
  }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    const charId = url.searchParams.get('char_id');
    const groupId = url.searchParams.get('group_id');
    const type = url.searchParams.get('type');

    if (type === 'all_images') {
      const { results } = await context.env.DB.prepare("SELECT image FROM messages WHERE image IS NOT NULL AND image != ''").all();
      for (const row of results as any[]) {
        if (row.image && row.image.includes('/api/images?key=')) {
          const match = row.image.match(/key=([^&]+)/);
          if (match) {
            const r2Key = decodeURIComponent(match[1]);
            try {
              await context.env.IMAGES_BUCKET.delete(r2Key);
              await context.env.DB.prepare("DELETE FROM images WHERE r2_key = ?").bind(r2Key).run();
            } catch (e) {}
          }
        }
      }
      await context.env.DB.prepare(
        "DELETE FROM messages WHERE image IS NOT NULL AND image != ''"
      ).run();
      return new Response("All Images Cleared");
    }

    if (id && id !== 'undefined' && id !== 'null') {
      await extractAndDeleteImage(context.env.DB, context.env.IMAGES_BUCKET, id);
      await context.env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
      return new Response("Single Message Deleted");
    }

    if (groupId && groupId !== 'undefined' && groupId !== 'null') {
      const { results } = await context.env.DB.prepare("SELECT image FROM messages WHERE group_id = ?").bind(groupId).all();
      for (const row of results as any[]) {
        if (row.image && row.image.includes('/api/images?key=')) {
          const match = row.image.match(/key=([^&]+)/);
          if (match) {
            const r2Key = decodeURIComponent(match[1]);
            try {
              await context.env.IMAGES_BUCKET.delete(r2Key);
              await context.env.DB.prepare("DELETE FROM images WHERE r2_key = ?").bind(r2Key).run();
            } catch (e) {}
          }
        }
      }
      await context.env.DB.prepare("DELETE FROM messages WHERE group_id = ?").bind(groupId).run();
      return new Response("Group Messages Cleared");
    }

    if (charId && charId !== 'undefined' && charId !== 'null') {
      await deleteImagesForChar(context.env.DB, context.env.IMAGES_BUCKET, charId);
      await context.env.DB.prepare(
        "DELETE FROM messages WHERE char_id = ? AND group_id IS NULL"
      ).bind(charId).run();
      return new Response("Character Messages Cleared");
    }

    return new Response("Missing Parameters", { status: 400 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
