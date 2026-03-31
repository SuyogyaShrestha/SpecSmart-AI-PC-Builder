"""
Admin-only API views for SpecSmart.
All endpoints require: IsAuthenticated + is_admin_role == True.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from parts.models import Part, Vendor
from builds.models import SavedBuild
from .serializers import UserSerializer, AdminUserSerializer

User = get_user_model()


class IsAdminRole(BasePermission):
    """Allow only users with role == 'admin'."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'is_admin_role', False)
        )


# ─── Stats ────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminRole])
def admin_stats(request):
    """GET /api/admin/stats/ — dashboard counters"""
    return Response({
        "parts_count": Part.objects.filter(is_active=True).count(),
        "users_count": User.objects.count(),
        "vendors_count": Vendor.objects.filter(is_active=True).count(),
        "builds_count": SavedBuild.objects.count(),
    })


@api_view(["POST"])
@permission_classes([IsAdminRole])
def admin_trigger_ml_retrain(request):
    """POST /api/admin/ml/retrain/ — spins up a thread to run the management command."""
    import threading
    from django.core.management import call_command
    
    def _run_retrain():
        try:
            call_command("retrain_ml")
        except Exception as e:
            print(f"Failed to retrain ML: {e}")

    threading.Thread(target=_run_retrain, daemon=True).start()
    return Response({"detail": "ML retraining sequence initiated. This will complete silently in the background over the next few minutes."})

# ─── Users ────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminRole])
def admin_users_list(request):
    """GET /api/admin/users/ — list all users"""
    users = User.objects.all().order_by("-date_joined")
    return Response(AdminUserSerializer(users, many=True).data)


@api_view(["PATCH"])
@permission_classes([IsAdminRole])
def admin_user_detail(request, pk: int):
    """
    PATCH /api/admin/users/<pk>/
    Allowed fields: role, is_active
    """
    user = get_object_or_404(User, pk=pk)
    serializer = AdminUserSerializer(user, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    serializer.save()
    return Response(serializer.data)


# ─── Parts ────────────────────────────────────────────────────────────────────

from parts.serializers import PartSerializer


def _update_part_vendor_urls(part, vendor_urls: dict):
    from parts.models import VendorListing, Vendor
    
    if not isinstance(vendor_urls, dict):
        return

    for vendor_slug, url in vendor_urls.items():
        if not url:
            try:
                vendor = Vendor.objects.get(vendor_slug=vendor_slug)
                VendorListing.objects.filter(part=part, vendor=vendor).delete()
            except Exception:
                pass
            continue
            
        try:
            vendor = Vendor.objects.get(vendor_slug=vendor_slug)
            
            # Using stable sku generation
            base_sku = f"{vendor_slug}-{part.id}"
            listing = VendorListing.objects.filter(part=part, vendor=vendor).first()
            
            if listing:
                if listing.product_url != url:
                    listing.product_url = url
                    listing.save(update_fields=["product_url"])
            else:
                VendorListing.objects.create(
                    part=part,
                    vendor=vendor,
                    product_url=url,
                    # save() in model will auto-gen the UUID if blank
                )
        except Exception:
            pass

    # Recalculate global minimum in-stock price
    from django.db.models import Min
    lowest_price = part.vendor_listings.filter(in_stock=True).exclude(last_price__isnull=True).aggregate(Min('last_price'))['last_price__min']
    part.price = lowest_price if lowest_price is not None else 0
    part.save(update_fields=["price"])


@api_view(["GET", "POST"])
@permission_classes([IsAdminRole])
def admin_parts_list(request):
    """
    GET  /api/admin/parts/        — list all parts (incl. inactive)
    POST /api/admin/parts/        — create a new part
    """
    if request.method == "GET":
        part_type = request.GET.get("type")
        qs = Part.objects.prefetch_related("vendor_listings", "vendor_listings__vendor").order_by("type", "name")
        if part_type:
            qs = qs.filter(type=part_type.upper())
        return Response(PartSerializer(qs, many=True).data)

    # POST
    vendor_urls = request.data.pop("vendor_urls", {}) if isinstance(request.data, dict) else {}
    serializer = PartSerializer(data=request.data)
    if serializer.is_valid():
        part = serializer.save()
        _update_part_vendor_urls(part, vendor_urls)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAdminRole])
def admin_part_detail(request, pk: int):
    """GET / PUT / PATCH / DELETE /api/admin/parts/<pk>/"""
    part = get_object_or_404(Part.objects.prefetch_related("vendor_listings", "vendor_listings__vendor"), pk=pk)

    if request.method == "GET":
        return Response(PartSerializer(part).data)

    if request.method in ("PUT", "PATCH"):
        # Make request.data mutable if it's a QueryDict
        data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        vendor_urls = data.pop("vendor_urls", {}) if "vendor_urls" in data else {}

        serializer = PartSerializer(part, data=data, partial=(request.method == "PATCH"))
        if serializer.is_valid():
            part = serializer.save()
            if vendor_urls:
                _update_part_vendor_urls(part, vendor_urls)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    # DELETE — Hard delete thoroughly removes the part from the DB
    if request.method == "DELETE":
        part.delete()
        return Response(status=204)


# ─── Vendors ──────────────────────────────────────────────────────────────────

from parts.serializers import VendorSerializer


@api_view(["GET"])
@permission_classes([IsAdminRole])
def admin_vendors_list(request):
    """GET /api/admin/vendors/ — list all vendors"""
    vendors = Vendor.objects.all().order_by("name")
    return Response(VendorSerializer(vendors, many=True).data)


@api_view(["PATCH"])
@permission_classes([IsAdminRole])
def admin_vendor_detail(request, pk: int):
    """PATCH /api/admin/vendors/<pk>/ — toggle is_active"""
    vendor = get_object_or_404(Vendor, pk=pk)
    serializer = VendorSerializer(vendor, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)
