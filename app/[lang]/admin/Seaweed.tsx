'use client'

export default function Seaweed() {

  return (
    <div className="container mx-auto pt-4 px-4  h-[calc(100vh-100px)]">
      <div className="w-full h-full border rounded-lg overflow-hidden bg-white shadow-lg">
        <iframe
          src="/api/seaweed-proxy/"
          className="w-full h-full border-0"
          title="SeaweedFS Interface"
        />
      </div>
    </div>
  )
}
