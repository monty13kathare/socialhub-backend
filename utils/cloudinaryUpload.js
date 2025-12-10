import cloudinary from "../config/cloudinary.js";


//   Upload a single image to Cloudinary

export const uploadSingleImage = async (fileBuffer, mimetype, folder = "uploads") => {
  const base64Data = `data:${mimetype};base64,${fileBuffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(base64Data, { folder });
  return {
    public_id: result.public_id,
    url: result.secure_url,
  };
};

export const uploadAvatarImage = async (fileBuffer, mimetype, folder = "avatars") => {
  const base64Data = `data:${mimetype};base64,${fileBuffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(base64Data, { folder });
  return {
    public_id: result.public_id,
    url: result.secure_url,
  };
};



export const deleteImages = async (publicIds) => {
  if (!publicIds) return;

  const ids = Array.isArray(publicIds) ? publicIds : [publicIds];
  const deletePromises = ids.map((id) => cloudinary.uploader.destroy(id));
  await Promise.all(deletePromises);
};
