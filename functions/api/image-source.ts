interface Env {
  IMAGES_BUCKET: R2Bucket;
}

const MAX_BYTES = 10 * 1024 * 1024;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const form = await context.request.formData();
    const file = form.get('image');

    if (!(file instanceof File)) {
      return Response.json({ error: '缺少原图文件。' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return Response.json({ error: '只允许上传图片文件。' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: '原图不能超过 10 MB。' }, { status: 400 });
    }

    const extension = file.type.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png';
    const key = `studio-sources/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    await context.env.IMAGES_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || 'image/png',
      },
      customMetadata: {
        temporary: 'true',
      },
    });

    return Response.json({ key });
  } catch (error: any) {
    return Response.json({ error: error?.message || '原图上传失败。' }, { status: 500 });
  }
};
