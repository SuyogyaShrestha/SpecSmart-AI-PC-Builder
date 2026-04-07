from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import SavedBuild
from .serializers import SavedBuildSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def build_list(request):
    """
    GET  /api/builds/        — list the current user's builds
    POST /api/builds/        — create a new saved build
    """
    if request.method == "GET":
        builds = SavedBuild.objects.filter(user=request.user)
        return Response(SavedBuildSerializer(builds, many=True).data)

    # POST — create
    serializer = SavedBuildSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def build_detail(request, pk: int):
    """
    GET    /api/builds/<pk>/  — retrieve one build
    PUT    /api/builds/<pk>/  — replace build
    PATCH  /api/builds/<pk>/  — partial update (e.g. rename)
    DELETE /api/builds/<pk>/  — delete
    """
    build = get_object_or_404(SavedBuild, pk=pk, user=request.user)

    if request.method == "GET":
        return Response(SavedBuildSerializer(build).data)

    if request.method in ("PUT", "PATCH"):
        partial = request.method == "PATCH"
        serializer = SavedBuildSerializer(build, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    # DELETE
    build.delete()
    return Response(status=204)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def compare_builds(request):
    """
    POST /api/builds/compare/
    Body: { "id_a": 1, "id_b": 2 }
    Returns an AI-powered comparison briefing.
    """
    id_a = request.data.get("id_a")
    id_b = request.data.get("id_b")
    if not id_a or not id_b:
        return Response({"detail": "Both id_a and id_b are required."}, status=400)

    build_a = get_object_or_404(SavedBuild, pk=id_a, user=request.user)
    build_b = get_object_or_404(SavedBuild, pk=id_b, user=request.user)

    from builder.services.llm_compare import get_llm_build_comparison
    # Use serializer to get the full dictionary data for the LLM
    data_a = SavedBuildSerializer(build_a).data
    data_b = SavedBuildSerializer(build_b).data

    result = get_llm_build_comparison(data_a, data_b)
    return Response(result)
