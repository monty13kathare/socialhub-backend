// utils/userPopulateFields.js
export const userPopulateFields = [
  {
    path: "posts",
    options: { sort: { createdAt: -1 } },
   populate: [
      {
        path: "author",
        select: "name username avatar",
      },
      {
        path: "taggedUsers",
        select: "name username avatar",
      },
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
    ],
  },
  {
    path: "followers",
    select: "name username avatar",
  },
  {
    path: "following",
    select: "name username avatar",
  },
  {
    path: "communities.community",
    model: "Community",
    populate: [
      {
        path: "createdBy",
        select: "name username avatar"
      },
      {
        path: "members.user",
        select: "name username avatar"
      }
    ]
  },
];
