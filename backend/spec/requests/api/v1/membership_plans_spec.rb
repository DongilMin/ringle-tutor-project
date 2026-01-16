# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::MembershipPlans", type: :request do
  describe "GET /api/v1/membership_plans" do
    it "returns all membership plans" do
      get "/api/v1/membership_plans"

      expect(response).to have_http_status(:ok)

      json = JSON.parse(response.body)
      expect(json["plans"]).to be_an(Array)
      expect(json["plans"].length).to eq(3)
    end

    it "includes basic plan with correct data" do
      get "/api/v1/membership_plans"

      json = JSON.parse(response.body)
      basic_plan = json["plans"].find { |p| p["type"] == "basic" }

      expect(basic_plan).to be_present
      expect(basic_plan["name"]).to eq("Basic")
      expect(basic_plan["name_ko"]).to eq("베이직")
      expect(basic_plan["price"]).to eq(9_900)
      expect(basic_plan["duration"]).to eq(30)
      expect(basic_plan["features"]).to eq([ "learning" ])
      expect(basic_plan["popular"]).to be false
    end

    it "includes premium plan with correct data" do
      get "/api/v1/membership_plans"

      json = JSON.parse(response.body)
      premium_plan = json["plans"].find { |p| p["type"] == "premium" }

      expect(premium_plan).to be_present
      expect(premium_plan["name"]).to eq("Premium")
      expect(premium_plan["name_ko"]).to eq("프리미엄")
      expect(premium_plan["price"]).to eq(19_900)
      expect(premium_plan["duration"]).to eq(60)
      expect(premium_plan["features"]).to eq([ "learning", "conversation", "analysis" ])
      expect(premium_plan["popular"]).to be true
    end

    it "includes enterprise plan with correct data" do
      get "/api/v1/membership_plans"

      json = JSON.parse(response.body)
      enterprise_plan = json["plans"].find { |p| p["type"] == "enterprise" }

      expect(enterprise_plan).to be_present
      expect(enterprise_plan["name"]).to eq("Enterprise")
      expect(enterprise_plan["name_ko"]).to eq("엔터프라이즈")
      expect(enterprise_plan["price"]).to eq(49_900)
      expect(enterprise_plan["duration"]).to eq(90)
      expect(enterprise_plan["features"]).to eq([ "learning", "conversation", "analysis" ])
      expect(enterprise_plan["popular"]).to be false
    end

    it "does not require authentication" do
      # No user or headers, should still work
      get "/api/v1/membership_plans"

      expect(response).to have_http_status(:ok)
    end

    it "returns plans with all required fields" do
      get "/api/v1/membership_plans"

      json = JSON.parse(response.body)
      required_fields = %w[type name name_ko price duration features popular]

      json["plans"].each do |plan|
        required_fields.each do |field|
          expect(plan).to have_key(field), "Plan should have '#{field}' field"
        end
      end
    end
  end
end
