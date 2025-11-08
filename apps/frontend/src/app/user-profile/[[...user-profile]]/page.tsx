import { UserProfile } from '@clerk/nextjs'

export default function UserProfilePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <UserProfile 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700",
          },
        }}
        routing="path"
        path="/user-profile"
      />
    </div>
  )
}