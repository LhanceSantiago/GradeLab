function Header({ isSidebarOpen, setIsSidebarOpen }) {

  return (
    <section className="p-5 border-primary border-b-4 lg:hidden">
        <div className="flex justify-between items-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex py-3 px-4 items-center justify-center rounded-md bg-primary text-light font-semibold">
                  GL
                </div>
                <h2 className="text-xl text-primary font-semibold">
                  GradeLab
                </h2>
              </div>
          </div>

          <div
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex flex-col gap-1.5 cursor-pointer">
              <span className="w-8 h-0.75 bg-primary rounded-4xl"></span>
              <span className="w-8 h-0.75 bg-primary rounded-4xl"></span>
              <span className="w-8 h-0.75 bg-primary rounded-4xl"></span>
          </div>
        </div>
    </section>
  )
}

export default Header
