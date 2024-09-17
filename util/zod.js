const { z } = require('zod');

const BlogsPaginationProps = z.object({
  categoryId: z.coerce.number().nullable(),
  page: z.coerce.number(),
  limit: z.coerce.number().nullable(),
});

const UserBlogsQueries = z.object({
  page: z.coerce.number(),
  limit: z.coerce.number().nullable(),
});

const BlogInsertionProps = z.object({
  title: z.string().trim().min(3),
  userId: z.string().trim().min(36),
  body: z.string().trim().min(3),
  categoryId: z.coerce.number().nullable(),
});

const SearchQueries = z.object({
  query: z.string().trim(),
  page: z.coerce.number(),
  limit: z.coerce.number().nullable(),
});

// Auth
const RegistrationProps = z.object({
  username: z.string().trim().min(3),
  email: z.string().email(),
  password: z.string().trim().min(8),
});

const LoginProps = z.object({
  password: z.string().trim().min(8),
  email: z.string().email(),
});

const EditBlogProps = z.object({
  title: z.string().trim().min(3),
  body: z.string().trim().min(3),
  categoryId: z.coerce.number().nullable(),
});

const CommentsProps = z.object({
  comment: z.string().trim().min(3),
  username: z.string().trim().min(3),
});

module.exports = {
  BlogsPaginationProps,
  UserBlogsQueries,
  BlogInsertionProps,
  SearchQueries,
  RegistrationProps,
  LoginProps,
  EditBlogProps,
  CommentsProps,
};
