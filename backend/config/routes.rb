Rails.application.routes.draw do
  # Health check
  get "up" => "rails/health#show", as: :rails_health_check

  # API v1
  namespace :api do
    namespace :v1 do
      # Membership plans (public)
      resources :membership_plans, only: [ :index ]

      # Users list (public, for demo user selection)
      resources :users, only: [ :index ]

      # User memberships
      resources :memberships, only: [ :index, :show ] do
        collection do
          get :current
        end
      end

      # Payments
      resources :payments, only: [ :index, :show, :create ]

      # Conversations (requires active membership)
      resources :conversations, only: [ :index, :show, :create ] do
        member do
          get :messages
          post :messages, action: :send_message
          post :audio, action: :send_audio
          post :stream, action: :stream_message
        end
      end

      # Admin endpoints
      namespace :admin do
        resources :users, only: [ :index ]
        resources :memberships, only: [ :index, :show, :create, :destroy ]
      end
    end
  end
end
