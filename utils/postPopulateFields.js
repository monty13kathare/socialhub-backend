export const postPopulateFields = [
  { path: "author", select: "name username avatar" },
  { path: "taggedUsers", select: "name username avatar" },
  {
    path: "comments",
    populate: [
      {
        path: "user",
        select: "avatar username name",
      },
      {
        path: "likes",
        select: "avatar username name",
      },
      {
        path: "replies.user",
        select: "avatar username name",
      },
    ],
  },
];
