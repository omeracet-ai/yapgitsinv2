import BlogForm from "../blog-form";

export default function NewBlogPostPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📝 Yeni Yazı</h1>
      <BlogForm />
    </div>
  );
}
