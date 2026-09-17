from typing import Literal

from pydantic import BaseModel, Field


class Location(BaseModel):
    cep: str = Field(min_length=1, max_length=9)
    cidade: str = Field(min_length=1, max_length=80)
    estado: str = Field(min_length=2, max_length=2)


class SubscriptionCreate(BaseModel):
    planId: str = Field(min_length=1, max_length=30)
    period: str = Field(min_length=1, max_length=20)
    paymentMethod: Literal["pix", "debit"]
    location: Location


class OwnerEntitlementCreate(BaseModel):
    location: Location


class Subscription(BaseModel):
    id: str
    planId: str
    planTitle: str
    period: str
    status: Literal["confirmed_mock", "active_owner"]
    paymentMocked: bool
    paymentMethod: Literal["pix", "debit", "owner"]
    location: Location
    createdAt: str