export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} AdotaPet - Plataforma de Adoção de Animais
        </p>
      </div>
    </footer>
  );
}
