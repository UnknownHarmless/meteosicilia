import type { PropsWithChildren } from 'react';
import Header from './header';

const Layout = ({ children }: PropsWithChildren) => {
    return (
        <div className="w-full overflow-x-hidden bg-gradient-to-br from-background to-muted">

            <Header />

            <main className="min-h-screen container mx-auto px-3 py-5 sm:px-4 sm:py-8">
                {children}

            </main>

            <footer className="border-t backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 text-center text-gray-400">

                </div>
            </footer>



        </div>
    );

};

export default Layout;
