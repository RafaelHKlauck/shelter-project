import { requireProfile } from "@/lib/auth/server";
import { EditProfileForm } from "./EditProfileForm";

export default async function EditProfilePage() {
  const { profile } = await requireProfile();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <EditProfileForm
        defaultValues={{
          full_name: profile.full_name,
          birth_date: profile.birth_date,
          housing_type: profile.housing_type,
          address_line: profile.address_line,
          address_number: profile.address_number ?? "",
          address_city: profile.address_city,
          address_state: profile.address_state,
          address_zip: profile.address_zip,
          avatar_url: profile.avatar_url ?? "",
        }}
      />
    </div>
  );
}
