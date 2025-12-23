export default function Footer() {
  return (
    <footer className="py-6 mt-auto flex items-center justify-center">
      <p className="text-xs text-muted-foreground/50">
        © {new Date().getFullYear()} Book Critics Club
      </p>
    </footer>
  );
}
