class UserSerializer < BaseSerializer
  def as_json
    {
      id: object.id,
      email: object.email,
      name: object.name
    }
  end
end
