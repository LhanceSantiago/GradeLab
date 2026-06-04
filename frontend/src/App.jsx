import { useEffect, useState } from "react"

function App() {
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch("http://127.0.0.1:5000/")
      .then(res => res.json())
      .then(data => setMessage(data.message))
  }, [])

  return (
    <div className="text-3xl text-center mt-10">
      {message}
    </div>
  )
}

export default App